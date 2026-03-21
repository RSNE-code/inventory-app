"use client"

import { useRef, useState, type ReactNode } from "react"
import { Trash2 } from "lucide-react"

interface SwipeableRowProps {
  children: ReactNode
  onDelete: () => void
  disabled?: boolean
  className?: string
}

export function SwipeableRow({ children, onDelete, disabled, className }: SwipeableRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const touchRef = useRef({ startX: 0, startY: 0, axis: null as "h" | "v" | null, swiping: false })
  const rafRef = useRef<number>(0)
  const [offset, setOffset] = useState(0)
  const [animate, setAnimate] = useState(false)
  const [deleted, setDeleted] = useState(false)

  function handleTouchStart(e: React.TouchEvent) {
    if (disabled) return
    const t = e.touches[0]
    touchRef.current = { startX: t.clientX, startY: t.clientY, axis: null, swiping: false }
    setAnimate(false)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (disabled) return
    const t = e.touches[0]
    const dx = t.clientX - touchRef.current.startX
    const dy = t.clientY - touchRef.current.startY

    // Axis lock after 10px movement
    if (!touchRef.current.axis) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        touchRef.current.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v"
      }
      return
    }

    if (touchRef.current.axis !== "h") return
    e.preventDefault()
    touchRef.current.swiping = true

    // Use rAF for smooth rendering
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      // Only allow left swipe (negative), with rubber-band resistance past halfway
      const rawX = Math.min(0, dx)
      const width = rowRef.current?.offsetWidth || 300
      const resistedX = rawX < -width * 0.5
        ? -width * 0.5 + (rawX + width * 0.5) * 0.3
        : rawX
      setOffset(resistedX)
    })
  }

  function handleTouchEnd() {
    if (disabled || !touchRef.current.swiping) {
      touchRef.current = { startX: 0, startY: 0, axis: null, swiping: false }
      return
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const width = rowRef.current?.offsetWidth || 300
    setAnimate(true)

    if (Math.abs(offset) > width * 0.3) {
      // Threshold reached — snap off screen
      setOffset(-width - 20)
      setDeleted(true)
      setTimeout(onDelete, 300)
    } else {
      // Spring back
      setOffset(0)
    }
    touchRef.current = { startX: 0, startY: 0, axis: null, swiping: false }
  }

  const revealProgress = Math.min(1, Math.abs(offset) / 120)

  return (
    <div ref={rowRef} className={`relative overflow-hidden ${className || ""}`}>
      {/* Red delete zone behind */}
      <div
        className="absolute inset-0 flex items-center justify-end rounded-xl"
        style={{
          background: `linear-gradient(90deg, transparent 40%, rgba(239, 68, 68, ${0.15 + revealProgress * 0.85}) 100%)`,
          opacity: offset < -5 ? 1 : 0,
          transition: offset < -5 ? "none" : "opacity 0.2s",
        }}
      >
        <div
          className="flex items-center gap-2 pr-6"
          style={{
            opacity: revealProgress,
            transform: `scale(${0.8 + revealProgress * 0.2})`,
            transition: animate ? "transform 0.2s" : "none",
          }}
        >
          <Trash2 className="h-6 w-6 text-white" />
          <span className="text-white font-bold text-base">Delete</span>
        </div>
      </div>

      {/* Swipeable content */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: animate
            ? deleted
              ? "transform 0.3s cubic-bezier(0.2, 0, 0, 1)"
              : "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "none",
          willChange: "transform",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
