"use client"

import { createContext, useContext, useState, useCallback, useRef } from "react"
import React from "react"

const VARIANT_COUNT = 6

interface CelebrationContextType {
  celebrate: () => void
  isActive: boolean
  variant: number | null
  dismiss: () => void
}

const CelebrationContext = createContext<CelebrationContextType>({
  celebrate: () => {},
  isActive: false,
  variant: null,
  dismiss: () => {},
})

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [variant, setVariant] = useState<number | null>(null)
  const lastVariantRef = useRef<number>(-1)

  const celebrate = useCallback(() => {
    // Pick a random variant that isn't the same as last time
    let next: number
    do {
      next = Math.floor(Math.random() * VARIANT_COUNT)
    } while (next === lastVariantRef.current && VARIANT_COUNT > 1)

    lastVariantRef.current = next
    setVariant(next)
    setIsActive(true)
  }, [])

  const dismiss = useCallback(() => {
    setIsActive(false)
    setVariant(null)
  }, [])

  const value = React.useMemo(
    () => ({ celebrate, isActive, variant, dismiss }),
    [celebrate, isActive, variant, dismiss]
  )

  return React.createElement(
    CelebrationContext.Provider,
    { value },
    children
  )
}

export function useCelebration() {
  return useContext(CelebrationContext)
}
