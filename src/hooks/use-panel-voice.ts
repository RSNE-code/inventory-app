"use client"

import { useState, useCallback, useRef } from "react"
import { useVoiceInput } from "./use-voice-input"

interface PanelRow {
  height: number
  quantity: number
}

interface UsePanelVoiceReturn {
  isListening: boolean
  isSupported: boolean
  isParsing: boolean
  transcript: string
  parsedRows: PanelRow[] | null
  startListening: () => void
  stopListening: () => void
  parseText: (text: string) => Promise<PanelRow[] | null>
  error: string | null
  reset: () => void
}

export function usePanelVoiceInput(context: {
  brand: string
  thickness: number
}): UsePanelVoiceReturn {
  const [isParsing, setIsParsing] = useState(false)
  const [parsedRows, setParsedRows] = useState<PanelRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const contextRef = useRef(context)
  contextRef.current = context

  const callParseAPI = useCallback(
    async (text: string): Promise<PanelRow[] | null> => {
      if (!text.trim()) return null

      setIsParsing(true)
      setError(null)

      try {
        const res = await fetch("/api/ai/parse-panels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(),
            brand: contextRef.current.brand,
            thickness: contextRef.current.thickness,
          }),
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || `Parse failed (${res.status})`)
        }

        const json = await res.json()
        const panels: PanelRow[] = json.data?.panels ?? []

        if (panels.length === 0) {
          setError("No panel sizes found in input")
          return null
        }

        setParsedRows(panels)
        return panels
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to parse panel input"
        setError(msg)
        return null
      } finally {
        setIsParsing(false)
      }
    },
    []
  )

  const onVoiceResult = useCallback(
    (transcript: string) => {
      callParseAPI(transcript)
    },
    [callParseAPI]
  )

  const { isListening, isSupported, transcript, startListening, stopListening, resetTranscript } =
    useVoiceInput(onVoiceResult)

  const reset = useCallback(() => {
    setParsedRows(null)
    setError(null)
    resetTranscript()
  }, [resetTranscript])

  return {
    isListening,
    isSupported,
    isParsing,
    transcript,
    parsedRows,
    startListening,
    stopListening,
    parseText: callParseAPI,
    error,
    reset,
  }
}
