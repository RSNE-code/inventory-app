"use client"

import { useState, useRef } from "react"
import { Mic, MicOff, Camera, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useVoiceInput } from "@/hooks/use-voice-input"
import type { ParseResult, ReceivingParseResult } from "@/lib/ai/types"

interface AIInputProps {
  onParseComplete: (result: ParseResult | ReceivingParseResult) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function AIInput({
  onParseComplete,
  placeholder = "Type or speak what you need...",
  className,
  disabled = false,
}: AIInputProps) {
  const [text, setText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isListening, isSupported, transcript, startListening, stopListening, resetTranscript } =
    useVoiceInput((finalTranscript) => {
      setText(finalTranscript)
      resetTranscript()
      handleTextSubmit(finalTranscript)
    })

  async function handleTextSubmit(input?: string) {
    const value = input || text
    if (!value.trim() || isProcessing) return

    setIsProcessing(true)
    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to parse input")
      }

      const { data } = await res.json()
      onParseComplete(data)
      setText("")
    } catch (error) {
      console.error("Parse error:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleImageCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || isProcessing) return

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append("image", file)

      const res = await fetch("/api/ai/parse-image", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to parse image")
      }

      const { data } = await res.json()
      onParseComplete(data)
    } catch (error) {
      console.error("Image parse error:", error)
    } finally {
      setIsProcessing(false)
      // Reset file input
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

  const displayText = isListening ? transcript || "Listening..." : text

  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm", className)}>
      {/* Text input area */}
      <div className="relative">
        <textarea
          value={isListening ? transcript : text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isProcessing || isListening}
          rows={2}
          className={cn(
            "w-full resize-none rounded-t-xl px-4 py-3 text-base",
            "border-0 focus:ring-0 focus:outline-none",
            "placeholder:text-gray-400 disabled:bg-gray-50",
            isListening && "text-blue-600"
          )}
        />
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-t-xl">
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Processing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          {/* Voice button */}
          {isSupported && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? "default" : "ghost"}
              className={cn(
                "h-10 w-10 rounded-full",
                isListening && "bg-red-500 hover:bg-red-600 animate-pulse"
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
            className="h-10 w-10 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
          >
            <Camera className="h-5 w-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageCapture}
          />
        </div>

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          className="h-10 w-10 rounded-full bg-[#E8792B] hover:bg-[#D06820]"
          onClick={() => handleTextSubmit()}
          disabled={disabled || isProcessing || (!text.trim() && !isListening)}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
