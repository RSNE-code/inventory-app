"use client"

import { useRef, useState } from "react"
import { Trash2 } from "lucide-react"

interface SwipeableRowProps {
  children: React.ReactNode
  onDelete: () => void
}

export function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null
    setSwiping(true)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!swiping) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Determine direction on first significant movement
    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy)
      }
      return
    }

    if (!isHorizontal.current) return

    // Only allow left swipe
    const newOffset = Math.min(0, Math.max(-100, dx))
    setOffsetX(newOffset)
  }

  function handleTouchEnd() {
    setSwiping(false)
    if (offsetX < -80) {
      onDelete()
    }
    setOffsetX(0)
    isHorizontal.current = null
  }

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center bg-red-500">
        <Trash2 className="h-5 w-5 text-white" />
      </div>

      {/* Swipeable content */}
      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-white"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 200ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  )
}
