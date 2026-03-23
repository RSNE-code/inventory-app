"use client"

import { useRef, useState, useCallback, type ReactNode } from "react"
import { Trash2 } from "lucide-react"

interface SwipeToDeleteProps {
  children: ReactNode
  onDelete: () => void
  enabled?: boolean
}

const DELETE_THRESHOLD = 80
const VELOCITY_THRESHOLD = 0.5
const DELETE_WIDTH = 80

export function SwipeToDelete({ children, onDelete, enabled = true }: SwipeToDeleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const touchStart = useRef({ x: 0, y: 0, time: 0 })
  const isDragging = useRef(false)
  const isScrolling = useRef<boolean | null>(null)

  const reset = useCallback(() => {
    setTransitioning(true)
    setOffsetX(0)
    setIsOpen(false)
    setTimeout(() => setTransitioning(false), 300)
  }, [])

  const snapOpen = useCallback(() => {
    setTransitioning(true)
    setOffsetX(-DELETE_WIDTH)
    setIsOpen(true)
    setTimeout(() => setTransitioning(false), 300)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    isDragging.current = false
    isScrolling.current = null
    setTransitioning(false)
  }, [enabled])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStart.current.x
    const deltaY = touch.clientY - touchStart.current.y

    // Determine if scrolling vertically or swiping horizontally
    if (isScrolling.current === null) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 5) {
        isScrolling.current = true
        return
      }
      if (Math.abs(deltaX) > 5) {
        isScrolling.current = false
      }
    }

    if (isScrolling.current) return

    isDragging.current = true

    // Calculate new offset based on current state
    let newOffset: number
    if (isOpen) {
      newOffset = -DELETE_WIDTH + deltaX
    } else {
      newOffset = deltaX
    }

    // Only allow swiping left (negative), with rubber-band resistance past threshold
    if (newOffset > 0) {
      newOffset = newOffset * 0.2
    } else if (newOffset < -DELETE_WIDTH * 1.5) {
      const excess = Math.abs(newOffset) - DELETE_WIDTH * 1.5
      newOffset = -(DELETE_WIDTH * 1.5 + excess * 0.3)
    }

    setOffsetX(newOffset)
  }, [enabled, isOpen])

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isDragging.current) return

    const elapsed = Date.now() - touchStart.current.time
    const velocity = Math.abs(offsetX - (isOpen ? -DELETE_WIDTH : 0)) / elapsed

    if (velocity > VELOCITY_THRESHOLD && offsetX < (isOpen ? -DELETE_WIDTH : 0)) {
      // Fast flick left → open
      snapOpen()
    } else if (velocity > VELOCITY_THRESHOLD && offsetX > (isOpen ? -DELETE_WIDTH : 0)) {
      // Fast flick right → close
      reset()
    } else if (offsetX < -DELETE_THRESHOLD) {
      // Past threshold → open
      snapOpen()
    } else {
      // Not past threshold → close
      reset()
    }

    isDragging.current = false
    isScrolling.current = null
  }, [enabled, offsetX, isOpen, snapOpen, reset])

  const handleDelete = useCallback(() => {
    setTransitioning(true)
    setOffsetX(-window.innerWidth)
    setTimeout(() => {
      onDelete()
    }, 200)
  }, [onDelete])

  if (!enabled) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Delete action behind */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center justify-center bg-red-500 text-white font-semibold text-sm active:bg-red-600"
          style={{ width: DELETE_WIDTH }}
          aria-label="Delete"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Sliding content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: transitioning ? "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
        }}
        className="relative bg-white z-10"
      >
        {children}
      </div>
    </div>
  )
}
