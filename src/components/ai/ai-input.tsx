"use client"

import { useState, useRef, useImperativeHandle, forwardRef } from "react"
import { Mic, MicOff, Camera, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
}

export const AIInput = forwardRef<AIInputHandle, AIInputProps>(function AIInput({
  onParseComplete,
  placeholder = "Type or speak what you need...",
  className,
  disabled = false,
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
        body: JSON.stringify({ text: value.trim() }),
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    }
  }

  return (
    <div className={cn(
      "bg-white rounded-2xl border border-border-custom shadow-brand transition-all duration-300",
      isFocused && "ai-input-glow border-brand-blue/30",
      isListening && "border-red-300 shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_2px_12px_rgba(239,68,68,0.08)]",
      className
    )}>
      {/* Text input area */}
      <div className="relative">
        <textarea
          value={isListening ? transcript : text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled || isProcessing || isListening}
          rows={2}
          className={cn(
            "w-full resize-none rounded-t-2xl px-4 py-3.5 text-base font-medium",
            "border-0 focus:ring-0 focus:outline-none",
            "placeholder:text-text-muted/60 placeholder:font-normal disabled:bg-surface-secondary/50",
            isListening && "text-brand-blue"
          )}
        />
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 rounded-t-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-brand-blue">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-semibold">
                {processingType === "image"
                  ? imageCount > 1
                    ? `Reading ${imageCount} pages...`
                    : "Reading image..."
                  : "Processing..."}
              </span>
            </div>
            {processingType === "image" && (
              <p className="text-[11px] text-text-muted mt-1">This may take a few seconds</p>
            )}
          </div>
        )}
      </div>

      {/* Error display */}
      {lastError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-t border-red-100">
          <span className="text-xs font-medium text-red-700 flex-1">{lastError}</span>
          <button
            onClick={() => setLastError(null)}
            className="text-red-400 hover:text-red-600 text-xs font-bold shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between px-3 py-2.5 border-t border-border-custom/40">
        <div className="flex items-center gap-1.5">
          {/* Voice button */}
          {isSupported && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? "default" : "ghost"}
              className={cn(
                "h-10 w-10 rounded-full transition-all",
                isListening
                  ? "bg-status-red hover:bg-red-600 text-white animate-mic-pulse"
                  : "text-text-muted hover:text-brand-blue hover:bg-brand-blue/6"
              )}
              onClick={isListening ? stopListening : startListening}
              disabled={disabled || isProcessing}
            >
              {isListening ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
          )}

          {/* Camera button */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full text-text-muted hover:text-brand-blue hover:bg-brand-blue/6 transition-all"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
          >
            <Camera className="h-5 w-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageCapture}
          />
        </div>

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full bg-brand-orange hover:bg-brand-orange-hover transition-all duration-200",
            "shadow-[0_2px_8px_rgba(232,121,43,0.3)] hover:shadow-[0_4px_12px_rgba(232,121,43,0.4)]",
            "disabled:shadow-none disabled:opacity-40"
          )}
          onClick={() => handleTextSubmit()}
          disabled={disabled || isProcessing || (!text.trim() && !isListening)}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
})
