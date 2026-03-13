"use client"

import { cn } from "@/lib/utils"
import { Mic } from "lucide-react"

type VoiceOrbState = "idle" | "listening" | "analyzing"

interface VoiceOrbProps {
  state: VoiceOrbState
  onClick: () => void
  disabled?: boolean
  size?: "sm" | "md"
  className?: string
}

/**
 * Animated voice input orb with three states:
 * - idle: subtle mic icon, tap to start
 * - listening: pulsing orb with radiating sound waves
 * - analyzing: spinning ring with processing indicator
 */
export function VoiceOrb({
  state,
  onClick,
  disabled = false,
  size = "md",
  className,
}: VoiceOrbProps) {
  const isSm = size === "sm"
  const orbSize = isSm ? "h-10 w-10" : "h-12 w-12"
  const iconSize = isSm ? "h-4.5 w-4.5" : "h-5 w-5"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex items-center justify-center rounded-full transition-all duration-300 shrink-0",
        orbSize,
        // Idle
        state === "idle" && "bg-surface-secondary text-text-muted hover:text-brand-blue hover:bg-brand-blue/8 active:scale-90",
        // Listening — brand blue orb
        state === "listening" && "bg-brand-blue text-white shadow-[0_0_20px_rgba(46,125,186,0.35)]",
        // Analyzing — subtle processing
        state === "analyzing" && "bg-navy/90 text-white cursor-wait",
        disabled && state === "idle" && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      {/* Radiating sound waves — listening only */}
      {state === "listening" && (
        <>
          <span className="absolute inset-0 rounded-full animate-voice-wave-1 bg-brand-blue/25" />
          <span className="absolute inset-0 rounded-full animate-voice-wave-2 bg-brand-blue/15" />
          <span className="absolute inset-0 rounded-full animate-voice-wave-3 bg-brand-blue/8" />
        </>
      )}

      {/* Analyzing spinner ring */}
      {state === "analyzing" && (
        <span className="absolute inset-[-3px] rounded-full border-2 border-transparent border-t-brand-blue border-r-brand-blue/40 animate-spin" />
      )}

      {/* Icon */}
      <span className="relative z-10 flex items-center justify-center">
        {state === "analyzing" ? (
          <AnalyzingBars className={iconSize} />
        ) : (
          <Mic className={cn(iconSize, state === "listening" && "animate-voice-mic-bounce")} />
        )}
      </span>
    </button>
  )
}

/** Three-bar equalizer animation for analyzing state */
function AnalyzingBars({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("text-white", className)} fill="currentColor">
      <rect x="3" y="6" width="3" rx="1.5" className="animate-eq-bar-1" />
      <rect x="8.5" y="4" width="3" rx="1.5" className="animate-eq-bar-2" />
      <rect x="14" y="7" width="3" rx="1.5" className="animate-eq-bar-3" />
    </svg>
  )
}

/** Label that shows below the orb */
export function VoiceOrbLabel({ state }: { state: VoiceOrbState }) {
  if (state === "idle") return null

  return (
    <span
      className={cn(
        "text-[11px] font-bold tracking-wide animate-fade-in",
        state === "listening" && "text-brand-blue",
        state === "analyzing" && "text-text-muted"
      )}
    >
      {state === "listening" ? "Listening..." : "Analyzing..."}
    </span>
  )
}
