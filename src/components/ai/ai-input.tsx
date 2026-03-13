"use client"

import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react"
import { Mic, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useVoiceInput } from "@/hooks/use-voice-input"
import type { ParseResult, ReceivingParseResult } from "@/lib/ai/types"

export interface AIInputHandle {
  triggerCamera: () => void
}

interface AIInputProps {
  onParseComplete: (result: ParseResult | ReceivingParseResult) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  context?: "general" | "receiving"
}

export const AIInput = forwardRef<AIInputHandle, AIInputProps>(function AIInput({
  onParseComplete,
  placeholder = "Type or speak what you need...",
  className,
  disabled = false,
  context = "general",
}, ref) {
  const [text, setText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingType, setProcessingType] = useState<"text" | "image">("text")
  const [imageCount, setImageCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    triggerCamera: () => fileInputRef.current?.click(),
  }))

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])

  const { isListening, isSupported, transcript, startListening, stopListening, resetTranscript } =
    useVoiceInput((finalTranscript) => {
      setText(finalTranscript)
      resetTranscript()
      handleTextSubmit(finalTranscript)
    })

  async function handleTextSubmit(input?: string) {
    const value = input || text
    if (!value.trim() || isProcessing) return

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

  async function handleImageCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0 || isProcessing) return

    setLastError(null)
    setIsProcessing(true)
    setProcessingType("image")
    setImageCount(files.length)
    try {
      const formData = new FormData()
      if (files.length === 1) {
        formData.append("image", files[0])
      } else {
        for (let i = 0; i < files.length; i++) {
          formData.append("images", files[i])
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

  return (
    <div className={cn("space-y-2", className)}>
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

        {/* Input area — sound bars when listening, processing message, or text input with send button */}
        <div className="flex-1 relative">
          {isListening ? (
            <div className="w-full h-11 rounded-xl border-2 border-brand-orange/30 bg-brand-orange/5 flex items-center justify-center gap-[3px] px-4">
              <span className="text-sm font-semibold text-brand-orange/70 mr-2">Listening</span>
              <span className="w-[3px] rounded-full bg-brand-orange/60 animate-soundbar-1" />
              <span className="w-[3px] rounded-full bg-brand-orange/60 animate-soundbar-2" />
              <span className="w-[3px] rounded-full bg-brand-orange/60 animate-soundbar-3" />
              <span className="w-[3px] rounded-full bg-brand-orange/60 animate-soundbar-4" />
              <span className="w-[3px] rounded-full bg-brand-orange/60 animate-soundbar-5" />
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
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleTextSubmit()
                  }
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full h-11 pl-3 pr-10 rounded-xl border-2 border-border-custom bg-white text-sm font-medium text-navy placeholder:text-text-muted/40 focus:outline-none focus:border-brand-blue/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => handleTextSubmit()}
                disabled={disabled || !text.trim()}
                className={cn(
                  "absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-lg transition-all",
                  text.trim()
                    ? "bg-brand-orange text-white hover:bg-brand-orange-hover active:scale-95"
                    : "text-text-muted/30"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
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
