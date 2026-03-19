"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { JobPicker } from "@/components/bom/job-picker"
import { LiveItemFeed } from "@/components/bom/live-item-feed"
import { FlaggedItemResolver } from "@/components/bom/flagged-item-resolver"
import { ProductPicker } from "@/components/bom/product-picker"
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
  // Unit conversion fields
  needsConversion?: boolean
  parsedUom?: string
  parsedQty?: number
  conversionFactor?: number
  catalogUom?: string
}

type Phase = "capture" | "processing" | "review"

// ─── HEIC detection + conversion ─────────────────

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase()
  if (type === "image/heic" || type === "image/heif") return true
  // iOS sometimes sends HEIC with no MIME — check extension
  const ext = file.name.toLowerCase().split(".").pop()
  return ext === "heic" || ext === "heif"
}

async function convertHeicToJpeg(file: File): Promise<File> {
  // Dynamic import — heic2any uses `window` at module level, can't be imported at top
  const { default: heic2any } = await import("heic2any")
  const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 })
  // heic2any can return a single blob or an array (for multi-frame HEIC)
  const result = Array.isArray(blob) ? blob[0] : blob
  const name = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg")
  return new File([result], name, { type: "image/jpeg" })
}

// ─── Image compression ──────────────────────────

async function compressImage(file: File): Promise<File> {
  // Convert HEIC → JPEG before canvas processing
  const input = isHeic(file) ? await convertHeicToJpeg(file) : file

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not load image: ${file.name}. Try taking a new photo.`))
    }, 15000)

    const img = new Image()
    const url = URL.createObjectURL(input)

    img.onerror = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(url)
      reject(new Error(`Unsupported image format: ${file.name}. Try taking a photo with the camera.`))
    }

    img.onload = () => {
      clearTimeout(timeout)
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

      // Start streaming parse
      const formData = new FormData()
      compressed.forEach((f) => formData.append("images", f))

      const res = await fetch("/api/ai/parse-image-fast", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to read image")
      }

      // Read NDJSON stream — items arrive one at a time
      setFeedPhase("pass1")
      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      let buffer = ""
      const allFeedItems: FeedItem[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || "" // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const parsed = JSON.parse(line)

            // Check for error from server
            if (parsed.error) {
              throw new Error(parsed.error)
            }

            const match: CatalogMatch = parsed.item
            const aiUom = match.parsedItem.unitOfMeasure
            const catalogUom = match.matchedProduct?.unitOfMeasure
            const BULK_UNITS = ["case", "box", "pallet", "carton", "bag", "roll", "lb", "lbs", "pound", "pounds"]
            const isBulkUnit = BULK_UNITS.includes(aiUom?.toLowerCase().trim() || "")
            const uomMismatch = isBulkUnit && catalogUom && aiUom?.toLowerCase().trim() !== catalogUom.toLowerCase().trim()
            const feedItem: FeedItem = {
              id: `item-${parsed.index}-${Date.now()}`,
              rawText: match.parsedItem.rawText,
              productName: match.matchedProduct?.name || match.parsedItem.name,
              productId: match.matchedProduct?.id || null,
              quantity: match.parsedItem.quantity,
              unitOfMeasure: match.matchedProduct?.unitOfMeasure || match.parsedItem.unitOfMeasure,
              confidence: match.matchConfidence,
              isPanel: !!match.panelSpecs,
              confirmed: match.matchConfidence >= 0.85,
              isNonCatalog: match.isNonCatalog,
              panelSpecs: match.panelSpecs || undefined,
              alternatives: match.alternativeMatches?.map((a) => ({
                productId: a.id,
                productName: a.name,
                confidence: a.matchConfidence,
              })),
              // Unit conversion tracking
              needsConversion: !!uomMismatch,
              parsedUom: isBulkUnit ? aiUom : undefined,
              parsedQty: isBulkUnit ? match.parsedItem.quantity : undefined,
              catalogUom: uomMismatch ? catalogUom : undefined,
            }

            allFeedItems.push(feedItem)
            // Push new item into state immediately — triggers render
            setItems([...allFeedItems])
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
              console.warn("[bom-photo] Failed to parse stream line:", line, parseErr)
            }
          }
        }
      }

      // Stream complete — run Pass 2 refinement in background
      setFeedPhase("pass2")

      try {
        const pass2Res = await fetch("/api/ai/refine-matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: allFeedItems.map((item) => ({
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
              return { ...item, confirmed: item.confidence >= 0.70 }
            })
          )
        }
      } catch {
        console.warn("Pass 2 refinement failed — using streamed results")
        setItems((prev) =>
          prev.map((item) => ({ ...item, confirmed: item.confidence >= 0.70 }))
        )
      }

      setFeedPhase("done")

      // Auto-resolve known unit conversions
      setItems((currentItems) => {
        const itemsNeedingConversion = currentItems.filter((i) => i.needsConversion && i.parsedUom && i.catalogUom)
        if (itemsNeedingConversion.length > 0) {
          // Fire lookups in parallel, update items as results come back
          for (const item of itemsNeedingConversion) {
            const params = new URLSearchParams({
              fromUnit: item.parsedUom!,
              toUnit: item.catalogUom!,
              ...(item.productId ? { productId: item.productId } : {}),
            })
            fetch(`/api/unit-conversions?${params}`)
              .then((r) => r.json())
              .then((res) => {
                if (res.data?.factor) {
                  const factor = res.data.factor
                  setItems((prev) =>
                    prev.map((i) => {
                      if (i.id !== item.id) return i
                      return {
                        ...i,
                        quantity: Math.round((i.parsedQty ?? i.quantity) * factor),
                        unitOfMeasure: i.catalogUom ?? i.unitOfMeasure,
                        conversionFactor: factor,
                        needsConversion: false,
                      }
                    })
                  )
                }
              })
              .catch(() => {}) // Leave as needing manual conversion
          }
        }
        return currentItems
      })

      setPhase("review")
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
    // Panels can never become custom items — button is hidden, but guard defensively
    const item = items.find((i) => i.id === id)
    if (item?.isPanel) return
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, confidence: 0.99, confirmed: true, isNonCatalog: true }
          : i
      )
    )
    setResolvingItemId(null)
  }

  function editItemDimensions(id: string, thickness: number, lengthFt: number, lengthIn: number) {
    const cutLengthFt = lengthFt + lengthIn / 12
    const cutLengthDisplay = lengthIn > 0 ? `${lengthFt}'${lengthIn}"` : `${lengthFt}'`
    const productName = `${thickness}" IMP — ${cutLengthDisplay}`
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              productName,
              panelSpecs: {
                ...i.panelSpecs,
                type: "panel",
                thickness,
                cutLengthFt,
                cutLengthDisplay,
              },
            }
          : i
      )
    )
  }

  async function handleConversionConfirm(id: string, factor: number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const newQty = Math.round((i.parsedQty ?? i.quantity) * factor)
        return {
          ...i,
          quantity: newQty,
          unitOfMeasure: i.catalogUom ?? i.unitOfMeasure,
          conversionFactor: factor,
          needsConversion: false,
        }
      })
    )
    // Save conversion for future use
    const item = items.find((i) => i.id === id)
    if (item?.parsedUom && item?.catalogUom) {
      fetch("/api/unit-conversions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.productId || null,
          fromUnit: item.parsedUom,
          toUnit: item.catalogUom,
          factor,
        }),
      }).catch(() => {}) // Fire and forget
    }
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
        parsedUom: item.parsedUom || null,
      }))

      const result = await createBom.mutateAsync({
        jobName: jobName.trim(),
        jobNumber: jobNumber || undefined,
        lineItems,
        source: "photo",
      } as Parameters<typeof createBom.mutateAsync>[0])

      // Feed confirmed matches into learning loop
      const confirmedMatches = items
        .filter((i) => i.productId && i.confidence >= 0.70 && !i.isNonCatalog)
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
            primaryMatch={resolvingItem.productId ? {
              productId: resolvingItem.productId,
              productName: resolvingItem.productName,
              confidence: resolvingItem.confidence,
            } : null}
            alternatives={resolvingItem.alternatives || []}
            onSelect={(productId, productName) => resolveItem(resolvingItem.id, productId, productName)}
            onKeepAsCustom={() => keepAsCustom(resolvingItem.id)}
            isPanel={resolvingItem.isPanel}
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
        onEditDimensions={editItemDimensions}
        onConversionConfirm={handleConversionConfirm}
      />

      {/* Add item — search catalog or type custom */}
      {phase === "review" && feedPhase === "done" && (
        <div className="px-4 py-3 border-b border-border-custom/40">
          <ProductPicker
            placeholder="Add item from catalog..."
            onSelect={(product) => {
              const newItem: FeedItem = {
                id: `manual-${Date.now()}`,
                rawText: product.name,
                productName: product.name,
                productId: product.id,
                quantity: 1,
                unitOfMeasure: product.unitOfMeasure,
                confidence: 1,
                isPanel: false,
                confirmed: true,
                isNonCatalog: false,
              }
              setItems((prev) => [...prev, newItem])
            }}
          />
        </div>
      )}

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
