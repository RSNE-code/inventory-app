"use client"

import { useState, useRef, useImperativeHandle, forwardRef, useEffect, useCallback, useMemo } from "react"
import { Mic, Send, Loader2, Search, Wrench } from "lucide-react"
import { cn, formatQuantity } from "@/lib/utils"
import { toast } from "sonner"
import { useVoiceInput } from "@/hooks/use-voice-input"
import { getDisplayQty } from "@/lib/units"
import type { ParseResult, ReceivingParseResult } from "@/lib/ai/types"

export interface AIInputHandle {
  triggerCamera: () => void
}

export interface ProductResult {
  id: string
  name: string
  sku: string | null
  unitOfMeasure: string
  shopUnit?: string | null
  currentQty: number
  dimLength?: number | null
  dimLengthUnit?: string | null
  dimWidth?: number | null
  dimWidthUnit?: string | null
  category?: { name: string }
  isAssemblyTemplate?: boolean
  assemblyType?: string
  assemblyDescription?: string | null
}

interface AIInputProps {
  onParseComplete: (result: ParseResult | ReceivingParseResult) => void
  onProductSelect?: (product: ProductResult) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  context?: "general" | "receiving"
  searchIcon?: boolean
  excludeIds?: string[]
}

export const AIInput = forwardRef<AIInputHandle, AIInputProps>(function AIInput({
  onParseComplete,
  onProductSelect,
  placeholder = "Type or speak what you need...",
  className,
  disabled = false,
  context = "general",
  searchIcon = false,
  excludeIds = [],
}, ref) {
  const [text, setText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingType, setProcessingType] = useState<"text" | "image">("text")
  const [imageCount, setImageCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Live catalog search state
  const [searchResults, setSearchResults] = useState<ProductResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useImperativeHandle(ref, () => ({
    triggerCamera: () => fileInputRef.current?.click(),
  }))

  const [isMounted, setIsMounted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounterRef = useRef(0)
  useEffect(() => { setIsMounted(true) }, [])

  function handleContainerDragEnter(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true)
  }
  function handleContainerDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setIsDragging(false)
  }
  function handleContainerDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }
  function handleContainerDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0
    const files = e.dataTransfer.files
    if (files.length > 0 && fileInputRef.current) {
      const dt = new DataTransfer()
      for (let i = 0; i < files.length; i++) dt.items.add(files[i])
      fileInputRef.current.files = dt.files
      fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }))
    }
  }

  const { isListening, isSupported, transcript, startListening, stopListening, resetTranscript } =
    useVoiceInput((finalTranscript) => {
      setText(finalTranscript)
      resetTranscript()
      handleTextSubmit(finalTranscript)
    })

  // Stabilize excludeIds to prevent re-renders from triggering search loops
  const excludeIdsKey = useMemo(() => JSON.stringify(excludeIds.slice().sort()), [excludeIds])
  const excludeIdsRef = useRef(excludeIds)
  excludeIdsRef.current = excludeIds

  // Live catalog search — debounced
  useEffect(() => {
    if (!onProductSelect || text.length < 2) {
      setSearchResults([])
      setSearchOpen(false)
      setHighlightIdx(-1)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/products/browse?search=${encodeURIComponent(text)}&limit=12`)
        if (res.ok) {
          const json = await res.json()
          const filtered = (json.data || []).filter(
            (p: ProductResult) => !excludeIdsRef.current.includes(p.id)
          )
          setSearchResults(filtered)
          setSearchOpen(filtered.length > 0)
          setHighlightIdx(-1)
        } else {
          setSearchResults([])
          setSearchOpen(false)
        }
      } catch {
        setSearchResults([])
        setSearchOpen(false)
      } finally {
        setSearchLoading(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, onProductSelect, excludeIdsKey])

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleSelectProduct(product: ProductResult) {
    onProductSelect?.(product)
    setText("")
    setSearchResults([])
    setSearchOpen(false)
    setHighlightIdx(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (searchOpen && searchResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setHighlightIdx((prev) => Math.min(prev + 1, searchResults.length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setHighlightIdx((prev) => Math.max(prev - 1, -1))
        return
      }
      if (e.key === "Enter" && highlightIdx >= 0) {
        e.preventDefault()
        handleSelectProduct(searchResults[highlightIdx])
        return
      }
    }
    if (e.key === "Enter") {
      e.preventDefault()
      setSearchOpen(false)
      handleTextSubmit()
    }
  }

  async function handleTextSubmit(input?: string) {
    const value = input || text
    if (!value.trim() || isProcessing) return

    setSearchOpen(false)
    setLastError(null)
    setIsProcessing(true)
    setProcessingType("text")
    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value.trim(), context }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to parse input (${res.status})`)
      }

      const { data } = await res.json()
      onParseComplete(data)
      setText("")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Something went wrong"
      setLastError(msg)
      toast.error(msg, { duration: 10000 })
      console.error("Parse error:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Detect HEIC/HEIF images (iPhone default format)
  function isHeic(file: File): boolean {
    const type = file.type.toLowerCase()
    if (type === "image/heic" || type === "image/heif") return true
    const ext = file.name.toLowerCase().split(".").pop()
    return ext === "heic" || ext === "heif"
  }

  // Convert HEIC → JPEG via heic2any (dynamic import to avoid SSR issues)
  async function convertHeicToJpeg(file: File): Promise<File> {
    const { default: heic2any } = await import("heic2any")
    const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 })
    const result = Array.isArray(blob) ? blob[0] : blob
    const name = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg")
    return new File([result], name, { type: "image/jpeg" })
  }

  // Compress an image file to fit under maxSizeKB using canvas
  async function compressImage(file: File, maxSizeKB = 800): Promise<File> {
    // Convert HEIC → JPEG before canvas processing
    const input = isHeic(file) ? await convertHeicToJpeg(file) : file

    // Skip if already small enough
    if (input.size <= maxSizeKB * 1024) return input

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url)
        reject(new Error(`Could not load image: ${file.name}. Try taking a new photo.`))
      }, 15000)

      const img = new Image()
      const url = URL.createObjectURL(input)
      img.onload = () => {
        clearTimeout(timeout)
        URL.revokeObjectURL(url)
        const canvas = document.createElement("canvas")
        const maxDim = 1200
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, width, height)
        let quality = 0.7
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (blob && (blob.size <= maxSizeKB * 1024 || quality <= 0.3)) {
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
      img.onerror = () => {
        clearTimeout(timeout)
        URL.revokeObjectURL(url)
        reject(new Error(`Unsupported image format: ${file.name}. Try taking a photo with the camera.`))
      }
      img.src = url
    })
  }

  async function handleImageCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0 || isProcessing) return

    setLastError(null)
    setIsProcessing(true)
    setProcessingType("image")
    setImageCount(files.length)
    try {
      const compressed = await Promise.all(
        Array.from(files).map((file) => compressImage(file))
      )

      const formData = new FormData()
      if (compressed.length === 1) {
        formData.append("image", compressed[0])
      } else {
        for (const file of compressed) {
          formData.append("images", file)
        }
      }

      const res = await fetch("/api/ai/parse-image", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to parse image (${res.status})`)
      }

      const { data } = await res.json()
      onParseComplete(data)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Something went wrong"
      setLastError(msg)
      toast.error(msg, { duration: 10000 })
      console.error("Image parse error:", error)
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const showSearchIcon = searchIcon || !!onProductSelect

  return (
    <div
      ref={containerRef}
      className={cn("space-y-2", className, isDragging && "ring-2 ring-brand-orange/40 rounded-2xl animate-drag-glow")}
      onDragEnter={handleContainerDragEnter}
      onDragLeave={handleContainerDragLeave}
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
    >
      {/* Mic + Input row */}
      <div className="flex items-center gap-2.5">
        {/* Mic button — orange CTA */}
        {isMounted && isSupported && (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={disabled || isProcessing}
            className={cn(
              "flex items-center justify-center h-12 w-12 rounded-xl shrink-0 transition-all",
              isListening
                ? "bg-brand-orange text-white shadow-[0_0_20px_rgba(232,121,43,0.45)] animate-mic-listening"
                : isProcessing
                  ? "bg-surface-secondary text-text-muted"
                  : "bg-brand-orange text-white shadow-[0_2px_10px_rgba(232,121,43,0.35)] hover:shadow-[0_4px_16px_rgba(232,121,43,0.45)] active:scale-95"
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>
        )}

        {/* Input area */}
        <div className="flex-1 relative">
          {isListening ? (
            <div className="w-full h-11 rounded-xl border-2 border-brand-orange bg-brand-orange/10 flex items-center justify-center gap-[3px] px-4">
              <span className="text-sm font-semibold text-brand-orange mr-2">Listening</span>
              <span className="w-[3px] rounded-full bg-brand-orange/80 animate-soundbar-1" />
              <span className="w-[3px] rounded-full bg-brand-orange/80 animate-soundbar-2" />
              <span className="w-[3px] rounded-full bg-brand-orange/80 animate-soundbar-3" />
              <span className="w-[3px] rounded-full bg-brand-orange/80 animate-soundbar-4" />
              <span className="w-[3px] rounded-full bg-brand-orange/80 animate-soundbar-5" />
            </div>
          ) : isProcessing ? (
            <div className="w-full h-11 rounded-xl border-2 border-border-custom bg-surface-secondary/50 flex items-center justify-center">
              <span className="text-sm font-medium text-text-muted">
                {processingType === "image"
                  ? imageCount > 1
                    ? `Reading ${imageCount} pages...`
                    : "Reading image..."
                  : "Processing..."}
              </span>
            </div>
          ) : (
            <div className="relative">
              {showSearchIcon && (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted/40 pointer-events-none" />
              )}
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  setIsFocused(true)
                  if (searchResults.length > 0) setSearchOpen(true)
                }}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  "w-full h-11 pr-10 rounded-xl border-2 border-border-custom bg-white text-sm font-medium text-navy placeholder:text-text-muted/40 focus:outline-none focus:border-brand-blue/40 transition-colors",
                  showSearchIcon ? "pl-9" : "pl-3"
                )}
              />
              <button
                type="button"
                onClick={() => { setSearchOpen(false); handleTextSubmit() }}
                disabled={disabled || !text.trim()}
                className={cn(
                  "absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-xl transition-all",
                  text.trim()
                    ? "bg-brand-orange text-white hover:bg-brand-orange-hover active:scale-95"
                    : "text-text-muted/30"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Live catalog search dropdown — iOS Spotlight style */}
          {searchOpen && !isListening && !isProcessing && (
            <div className="absolute z-50 top-full mt-1.5 w-full bg-white/[0.98] backdrop-blur-xl border border-border-custom/60 rounded-2xl shadow-[0_8px_32px_rgba(11,29,58,0.12)] max-h-64 overflow-y-auto animate-dropdown-in">
              {searchLoading ? (
                <div className="px-4 py-4">
                  <div className="progress-indeterminate" />
                  <p className="text-xs text-text-muted text-center mt-2">Searching catalog...</p>
                </div>
              ) : (
                <div className="py-1">
                  {searchResults.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectProduct(p)}
                      className={cn(
                        "search-result-row w-full text-left px-4 py-3 flex items-start justify-between gap-3",
                        idx === highlightIdx ? "bg-brand-blue/[0.06]" : "",
                        p.isAssemblyTemplate ? "bg-brand-blue/[0.04]" : ""
                      )}
                    >
                      <div className="min-w-0 flex-1 flex items-start gap-2.5">
                        {p.isAssemblyTemplate && (
                          <div className="h-7 w-7 rounded-lg bg-brand-blue/15 flex items-center justify-center shrink-0 mt-0.5">
                            <Wrench className="h-3.5 w-3.5 text-brand-blue" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-navy leading-snug break-words">{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {p.isAssemblyTemplate ? (
                              <>
                                <span className="inline-flex items-center text-[11px] font-semibold text-brand-blue bg-brand-blue/15 px-1.5 py-0.5 rounded">
                                  RSNE Fab
                                </span>
                                {p.category && (
                                  <span className="text-xs text-text-muted">{p.category.name}</span>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-text-muted">
                                {p.sku || "No SKU"} · {p.unitOfMeasure}
                                {p.category ? ` · ${p.category.name}` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      {!p.isAssemblyTemplate && (
                        <div className="text-right shrink-0 pt-0.5">
                          <span className="text-xs font-semibold text-brand-blue tabular-nums">
                            {(() => { const d = getDisplayQty(p); return `${formatQuantity(d.qty)}` })()}
                          </span>
                          <p className="text-[10px] text-text-muted">
                            {(() => { const d = getDisplayQty(p); return d.unit })()}
                          </p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input for camera (triggered via ref) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageCapture}
      />

      {/* Error display */}
      {lastError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl">
          <span className="text-xs font-medium text-red-700 flex-1">{lastError}</span>
          <button
            onClick={() => setLastError(null)}
            className="text-red-400 hover:text-red-600 text-xs font-bold shrink-0"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
})
