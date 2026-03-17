"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { JobPicker } from "@/components/bom/job-picker"
import { LiveItemFeed } from "@/components/bom/live-item-feed"
import { FlaggedItemResolver } from "@/components/bom/flagged-item-resolver"
import { useCreateBom } from "@/hooks/use-boms"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Camera,
  ClipboardList,
  ImagePlus,
  ShoppingCart,
  ChevronUp,
  Minus,
  Plus,
  X,
} from "lucide-react"
import type { CatalogMatch } from "@/lib/ai/types"

// ─── Types ────────────────────────────────────────

interface FeedItem {
  id: string
  rawText: string
  productName: string
  productId: string | null
  quantity: number
  unitOfMeasure: string
  confidence: number
  isPanel: boolean
  confirmed: boolean
  isNonCatalog: boolean
  panelSpecs?: Record<string, unknown>
  alternatives?: Array<{ productId: string; productName: string; confidence: number }>
}

type Phase = "capture" | "processing" | "review"

// ─── Image compression (from existing AIInput) ────

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement("canvas")
      let w = img.width
      let h = img.height
      const maxDim = 1200
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, w, h)

      let quality = 0.7
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (blob && (blob.size <= 800000 || quality <= 0.3)) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }))
            } else {
              quality -= 0.15
              tryCompress()
            }
          },
          "image/jpeg",
          quality
        )
      }
      tryCompress()
    }
    img.src = url
  })
}

// ─── Main Component ───────────────────────────────

export function BomPhotoCapture() {
  const router = useRouter()
  const createBom = useCreateBom()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [phase, setPhase] = useState<Phase>("capture")
  const [jobName, setJobName] = useState("")
  const [jobNumber, setJobNumber] = useState<string | null>(null)
  const [items, setItems] = useState<FeedItem[]>([])
  const [feedPhase, setFeedPhase] = useState<"loading" | "pass1" | "pass2" | "done">("loading")
  const [resolvingItemId, setResolvingItemId] = useState<string | null>(null)
  const [cartExpanded, setCartExpanded] = useState(false)
  const [photoThumbnail, setPhotoThumbnail] = useState<string | null>(null)

  // ─── Photo capture + parse pipeline ─────────

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setPhase("processing")
    setFeedPhase("loading")
    setItems([])

    // Create thumbnail for reference
    const thumbUrl = URL.createObjectURL(files[0])
    setPhotoThumbnail(thumbUrl)

    try {
      // Compress images
      const compressed: File[] = []
      for (let i = 0; i < files.length; i++) {
        compressed.push(await compressImage(files[i]))
      }

      // Pass 1: Fast parse
      const formData = new FormData()
      compressed.forEach((f) => formData.append("images", f))

      const pass1Res = await fetch("/api/ai/parse-image-fast", {
        method: "POST",
        body: formData,
      })

      if (!pass1Res.ok) {
        const err = await pass1Res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to read image")
      }

      const pass1Data = await pass1Res.json()
      const pass1Items: CatalogMatch[] = pass1Data.data?.items || []

      // Convert to feed items
      const feedItems: FeedItem[] = pass1Items.map((match, i) => ({
        id: `item-${i}-${Date.now()}`,
        rawText: match.parsedItem.rawText,
        productName: match.matchedProduct?.name || match.parsedItem.name,
        productId: match.matchedProduct?.id || null,
        quantity: match.parsedItem.quantity,
        unitOfMeasure: match.matchedProduct?.unitOfMeasure || match.parsedItem.unitOfMeasure,
        confidence: match.matchConfidence,
        isPanel: !!match.panelSpecs,
        confirmed: false,
        isNonCatalog: match.isNonCatalog,
        panelSpecs: match.panelSpecs || undefined,
        alternatives: match.alternativeMatches?.map((a) => ({
          productId: a.id,
          productName: a.name,
          confidence: a.matchConfidence,
        })),
      }))

      setItems(feedItems)
      setFeedPhase("pass1")

      // Pass 2: Background refinement (after a brief delay to let Pass 1 render)
      setTimeout(async () => {
        setFeedPhase("pass2")

        try {
          const pass2Res = await fetch("/api/ai/refine-matches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: feedItems.map((item) => ({
                rawText: item.rawText,
                matchedProductId: item.productId,
                confidence: item.confidence,
                quantity: item.quantity,
              })),
            }),
          })

          if (pass2Res.ok) {
            const pass2Data = await pass2Res.json()
            const refinedItems = pass2Data.data?.items || []

            // Update items with refined matches
            setItems((prev) =>
              prev.map((item) => {
                const refined = refinedItems.find(
                  (r: { rawText: string; refined: boolean; confidence: number; matchedProductId: string | null }) =>
                    r.rawText.toLowerCase().trim() === item.rawText.toLowerCase().trim()
                )
                if (refined?.refined && refined.confidence > item.confidence) {
                  return {
                    ...item,
                    confidence: refined.confidence,
                    productId: refined.matchedProductId || item.productId,
                    confirmed: true,
                  }
                }
                return { ...item, confirmed: item.confidence >= 0.85 }
              })
            )
          }
        } catch {
          // Pass 2 failure is non-critical — Pass 1 results still usable
          console.warn("Pass 2 refinement failed — using Pass 1 results")
          setItems((prev) =>
            prev.map((item) => ({ ...item, confirmed: item.confidence >= 0.85 }))
          )
        }

        setFeedPhase("done")
        setPhase("review")
      }, 500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process image")
      setPhase("capture")
      setPhotoThumbnail(null)
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ─── Item operations ────────────────────────

  function updateItemQty(id: string, qty: number) {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)))
    }
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function resolveItem(id: string, productId: string, productName: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, productId, productName, confidence: 0.99, confirmed: true, isNonCatalog: false }
          : i
      )
    )
    setResolvingItemId(null)
  }

  function keepAsCustom(id: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, confidence: 0.99, confirmed: true, isNonCatalog: true }
          : i
      )
    )
    setResolvingItemId(null)
  }

  // ─── Submit BOM ─────────────────────────────

  async function handleSubmit() {
    if (!jobName.trim()) {
      toast.error("Select a job first")
      return
    }
    if (items.length === 0) {
      toast.error("No items to create BOM")
      return
    }

    try {
      const lineItems = items.map((item) => ({
        productId: item.isNonCatalog ? null : item.productId,
        tier: "TIER_1" as const,
        qtyNeeded: item.quantity,
        isNonCatalog: item.isNonCatalog,
        nonCatalogName: item.isNonCatalog ? item.productName : null,
        nonCatalogUom: item.isNonCatalog ? item.unitOfMeasure : null,
        nonCatalogSpecs: item.panelSpecs || null,
        matchConfidence: item.confidence,
        rawText: item.rawText,
      }))

      const result = await createBom.mutateAsync({
        jobName: jobName.trim(),
        jobNumber: jobNumber || undefined,
        lineItems,
        source: "photo",
      } as Parameters<typeof createBom.mutateAsync>[0])

      // Feed confirmed matches into learning loop
      const confirmedMatches = items
        .filter((i) => i.productId && i.confidence >= 0.85 && !i.isNonCatalog)
        .map((i) => ({ rawText: i.rawText, productId: i.productId! }))

      if (confirmedMatches.length > 0) {
        fetch("/api/match-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matches: confirmedMatches }),
        }).catch(() => {}) // Fire and forget
      }

      toast.success("BOM created")
      router.push(`/boms/${result.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create BOM")
    }
  }

  // ─── Render: Capture Phase ──────────────────

  if (phase === "capture") {
    return (
      <div className="space-y-4">
        {/* Job picker */}
        <div className="px-0">
          <JobPicker
            onSelect={(job) => {
              if (job.name) {
                setJobName(job.name)
                setJobNumber(job.number)
              } else {
                setJobName("")
                setJobNumber(null)
              }
            }}
            selectedName={jobName || undefined}
            selectedNumber={jobNumber}
          />
        </div>

        {/* Camera hero */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-4 py-16 rounded-2xl bg-gradient-to-b from-navy/[0.03] to-navy/[0.08] border-2 border-dashed border-brand-orange/40 hover:border-brand-orange/60 active:scale-[0.99] transition-all"
        >
          <div className="h-20 w-20 rounded-2xl bg-brand-orange flex items-center justify-center shadow-lg shadow-brand-orange/20">
            <Camera className="h-10 w-10 text-white" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-navy">Snap Your Material List</p>
            <p className="text-sm text-text-muted mt-1">Take a photo of your handwritten or printed list</p>
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoCapture}
          className="hidden"
        />

        {/* Manual fallback */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push("/boms/new?mode=manual")}
            className="text-sm text-text-muted hover:text-brand-blue font-medium transition-colors"
          >
            or enter manually →
          </button>
        </div>
      </div>
    )
  }

  // ─── Render: Processing + Review Phase ──────

  const resolvingItem = resolvingItemId ? items.find((i) => i.id === resolvingItemId) : null
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className={cn("pb-52")}>
      {/* Photo thumbnail + job reference */}
      <div className="flex items-center gap-3 px-4 py-2">
        {photoThumbnail && (
          <img
            src={photoThumbnail}
            alt="Material list"
            className="h-10 w-10 rounded-lg object-cover border border-border-custom"
          />
        )}
        <div className="flex-1 min-w-0">
          {jobName ? (
            <p className="text-sm font-semibold text-navy truncate">{jobName}</p>
          ) : (
            <JobPicker
              onSelect={(job) => {
                if (job.name) { setJobName(job.name); setJobNumber(job.number) }
              }}
              selectedName={undefined}
              selectedNumber={null}
            />
          )}
        </div>
        {phase === "review" && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-10 w-10 flex items-center justify-center rounded-lg bg-surface-secondary text-text-muted"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Flagged item resolver (modal-like overlay) */}
      {resolvingItem && (
        <div className="px-4 py-2">
          <FlaggedItemResolver
            rawText={resolvingItem.rawText}
            alternatives={resolvingItem.alternatives || []}
            onSelect={(productId, productName) => resolveItem(resolvingItem.id, productId, productName)}
            onKeepAsCustom={() => keepAsCustom(resolvingItem.id)}
          />
        </div>
      )}

      {/* Live item feed */}
      <LiveItemFeed
        items={items}
        phase={feedPhase}
        onUpdateQty={updateItemQty}
        onDelete={deleteItem}
        onResolveFlagged={setResolvingItemId}
      />

      {/* Sticky bottom bar */}
      {items.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-border-custom shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          {/* Expanded cart */}
          {cartExpanded && (
            <div className="max-h-48 overflow-y-auto border-b border-border-custom">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 px-4 py-2 border-b border-border-custom/30 last:border-0">
                  <p className="flex-1 text-sm font-medium text-navy truncate">{item.productName}</p>
                  <span className="text-sm font-bold text-brand-blue tabular-nums">{item.quantity}</span>
                  <span className="text-xs text-text-muted">{item.unitOfMeasure}</span>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 space-y-2">
            <button
              type="button"
              onClick={() => setCartExpanded(!cartExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-secondary"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-brand-blue" />
                <span className="text-sm font-bold text-navy">
                  {items.length} item{items.length !== 1 ? "s" : ""} ({totalQty} total)
                </span>
              </div>
              <ChevronUp className={cn("h-4 w-4 text-text-muted transition-transform", cartExpanded && "rotate-180")} />
            </button>

            <Button
              onClick={handleSubmit}
              disabled={createBom.isPending || !jobName.trim() || items.length === 0 || feedPhase !== "done"}
              className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-base rounded-xl"
            >
              <ClipboardList className="h-5 w-5 mr-2" />
              {createBom.isPending
                ? "Creating..."
                : feedPhase !== "done"
                  ? "Processing..."
                  : `Create BOM (${items.length} item${items.length !== 1 ? "s" : ""})`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
