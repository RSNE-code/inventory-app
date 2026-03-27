"use client"

import { useState, useRef, useCallback, useEffect } from "react"
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
  Check,
  ClipboardList,
  ImagePlus,
  ShoppingCart,
  ChevronUp,
  Minus,
  Plus,
  Upload,
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
  isAssembly?: boolean
  nonCatalogCategory?: string
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
  const [isDragging, setIsDragging] = useState(false)
  const [showSuccessFlash, setShowSuccessFlash] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)

  // ─── Drag-and-drop handlers ────────────────
  const dragCounter = useRef(0)

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0
    const files = e.dataTransfer.files
    if (files.length > 0) {
      // Feed files through the same pipeline as the input
      const dt = new DataTransfer()
      for (let i = 0; i < files.length; i++) dt.items.add(files[i])
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files
        fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }))
      }
    }
  }

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
              confirmed: match.matchConfidence >= 0.95,
              isNonCatalog: match.isNonCatalog,
              isAssembly: !!match.matchedProduct?.isAssembly,
              nonCatalogCategory: match.matchedProduct?.categoryName || match.parsedItem.category || undefined,
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
                  confirmed: refined.confidence >= 0.95,
                }
              }
              return { ...item, confirmed: item.confidence >= 0.95 }
            })
          )
        }
      } catch {
        console.warn("Pass 2 refinement failed — using streamed results")
        setItems((prev) =>
          prev.map((item) => ({ ...item, confirmed: item.confidence >= 0.95 }))
        )
      }

      setFeedPhase("done")

      // Success flash before transitioning to review
      setShowSuccessFlash(true)
      await new Promise((r) => setTimeout(r, 800))
      setShowSuccessFlash(false)

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
    const clamped = Math.max(0, qty)
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: clamped } : i)))
  }

  function updateItemUnit(id: string, unit: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, unitOfMeasure: unit } : i)))
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function resolveItem(id: string, productId: string, productName: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              productId,
              productName,
              confidence: 0.99,
              confirmed: true,
              isNonCatalog: false,
            }
          : i
      )
    )
    setResolvingItemId(null)
    toast.success(`Matched to ${productName}`)
  }

  function keepAsCustom(id: string) {
    // Panels can never become custom items — button is hidden, but guard defensively
    const item = items.find((i) => i.id === id)
    if (item?.isPanel) return
    // Use rawText as the custom item name — strip leading quantity + unit abbreviation
    // e.g., "5s TWS Cover Plate" → "TWS Cover Plate", "2 pcs Hinge" → "Hinge"
    const customName = item?.rawText
      ? item.rawText.replace(/^\d+\s*(pc|pcs|ea|each|x|s|sheets?|boxes?|tubes?|rolls?|cases?|bundles?|panels?|ft|lf|sf|sqft|lbs?|pounds?|pallets?|cartons?|bags?|ct|count)?\s*/i, "").trim() || item.rawText
      : item?.productName || "Custom item"
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, productName: customName, productId: null, confidence: 0.99, confirmed: true, isNonCatalog: true }
          : i
      )
    )
    setResolvingItemId(null)
    toast.success(`Added "${customName}" as custom item`)
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
    if (submitted) return
    if (!jobName.trim()) {
      toast.error("Select a job first")
      return
    }
    // Filter out items with 0 quantity
    const validItems = items.filter((item) => item.quantity > 0)
    if (validItems.length === 0) {
      toast.error("No items to create BOM")
      return
    }

    try {
      const lineItems = validItems.map((item) => ({
        // Assembly products are real catalog items — no more non-catalog hack
        productId: item.isNonCatalog ? null : item.productId,
        tier: "TIER_1" as const,
        qtyNeeded: item.quantity,
        isNonCatalog: item.isNonCatalog,
        nonCatalogName: item.isNonCatalog ? item.productName : null,
        nonCatalogCategory: item.isNonCatalog ? (item.nonCatalogCategory || null) : null,
        nonCatalogUom: item.isNonCatalog ? item.unitOfMeasure : null,
        nonCatalogSpecs: item.panelSpecs || null,
        matchConfidence: item.confidence,
        rawText: item.rawText,
        parsedUom: item.parsedUom || null,
        inputUnit: item.unitOfMeasure || null,
      }))

      const result = await createBom.mutateAsync({
        jobName: jobName.trim(),
        jobNumber: jobNumber || undefined,
        lineItems,
        source: "photo",
      } as Parameters<typeof createBom.mutateAsync>[0])

      setSubmitted(true)

      // Feed confirmed matches into learning loop (catalog + custom items)
      const allConfirmedMatches = validItems
        .filter((i) => i.confidence >= 0.70 && (i.productId || i.isNonCatalog))
        .map((i) => {
          if (i.isNonCatalog) {
            return { rawText: i.rawText, customName: i.productName }
          }
          return { rawText: i.rawText, productId: i.productId! }
        })

      if (allConfirmedMatches.length > 0) {
        fetch("/api/match-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matches: allConfirmedMatches }),
        }).catch(() => {}) // Fire and forget
      }

      // Show success overlay then navigate to BOM list
      setShowSuccessOverlay(true)
      setTimeout(() => {
        router.push("/boms")
      }, 1200)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create BOM")
    }
  }

  // ─── Render: Capture Phase ──────────────────

  if (phase === "capture") {
    return (
      <div
        className="space-y-4"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
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

        {/* Camera hero — drag-and-drop enabled */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "w-full flex flex-col items-center justify-center gap-4 py-16 rounded-2xl bg-gradient-to-b from-navy/[0.03] to-navy/[0.08] border-2 border-dashed border-brand-orange/40 hover:border-brand-orange/60 active:scale-[0.99] transition-all animate-fade-in-up",
            isDragging && "animate-drag-glow bg-brand-orange/[0.04]"
          )}
        >
          {isDragging ? (
            <>
              <div className="h-20 w-20 rounded-2xl bg-brand-orange/20 border-2 border-brand-orange flex items-center justify-center">
                <Upload className="h-10 w-10 text-brand-orange" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-brand-orange">Drop your image here</p>
                <p className="text-sm text-brand-orange/60 mt-1">Release to start scanning</p>
              </div>
            </>
          ) : (
            <>
              <div className="h-20 w-20 rounded-2xl bg-brand-orange flex items-center justify-center shadow-brand-md shadow-brand-orange/20">
                <Camera className="h-10 w-10 text-white" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-navy">Snap Your Material List</p>
                <p className="text-sm text-text-muted mt-1">Take a photo or drag & drop an image</p>
              </div>
            </>
          )}
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
    <div className={cn("pb-52", showSuccessFlash && "animate-success-flash rounded-2xl")}>
      {/* Success overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-green-900/80 backdrop-blur-sm animate-fade-in-up">
          <div className="animate-ios-checkmark h-20 w-20 rounded-full bg-green-500 flex items-center justify-center mb-4">
            <Check className="h-10 w-10 text-white" />
          </div>
          <p className="text-2xl font-bold text-white animate-fade-in-up" style={{ animationDelay: "200ms" }}>BOM Created!</p>
        </div>
      )}

      {/* Photo thumbnail — large during processing, small during review */}
      {phase === "processing" && photoThumbnail && (
        <div className="px-4 py-3">
          <div className="relative rounded-2xl overflow-hidden ring-2 ring-brand-orange/40 animate-processing-glow">
            <img
              src={photoThumbnail}
              alt="Material list"
              className="w-full max-h-64 object-cover"
            />
            <div className="animate-scan-line" />
          </div>
          <div className="flex items-center justify-center gap-1 mt-3">
            <p className="text-sm font-semibold text-navy">Analyzing materials</p>
            <span className="analyzing-dots flex gap-0.5 text-brand-orange font-bold">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        </div>
      )}

      {/* Compact header during review */}
      {phase === "review" && (
        <div className="flex items-center gap-3 px-4 py-2">
          {photoThumbnail && (
            <img
              src={photoThumbnail}
              alt="Material list"
              className="h-10 w-10 rounded-xl object-cover border border-border-custom"
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface-secondary text-text-muted"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Live item feed — resolver expands inline below tapped item */}
      <LiveItemFeed
        items={items}
        phase={feedPhase}
        onUpdateQty={updateItemQty}
        onUpdateUnit={updateItemUnit}
        onDelete={deleteItem}
        onResolveFlagged={setResolvingItemId}
        onEditDimensions={editItemDimensions}
        onConversionConfirm={handleConversionConfirm}
        resolvingItemId={resolvingItemId}
        onResolveSelect={(id, productId, productName) => resolveItem(id, productId, productName)}
        onResolveKeepAsCustom={(id) => keepAsCustom(id)}
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
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface-secondary"
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
              disabled={submitted || createBom.isPending || !jobName.trim() || items.length === 0 || feedPhase !== "done"}
              className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-base rounded-xl shadow-[0_4px_16px_rgba(232,121,43,0.25)] hover:shadow-[0_6px_24px_rgba(232,121,43,0.35)] transition-all active:scale-95"
            >
              <ClipboardList className="h-5 w-5 mr-2" />
              {submitted
                ? "Created!"
                : createBom.isPending
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
