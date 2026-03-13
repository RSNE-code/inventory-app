"use client"

import { useState } from "react"
import { Building2 } from "lucide-react"

interface SupplierLogoProps {
  logoUrl: string | null | undefined
  name: string
  size?: number
  className?: string
  dark?: boolean
}

export function SupplierLogo({ logoUrl, name, size = 32, className = "", dark = false }: SupplierLogoProps) {
  const [failed, setFailed] = useState(false)

  if (!logoUrl || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg shrink-0 ${
          dark ? "bg-white/10 text-white/60" : "bg-surface-secondary text-text-muted"
        } ${className}`}
        style={{ width: size, height: size }}
      >
        <Building2 style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    )
  }

  return (
    <img
      src={logoUrl}
      alt={`${name} logo`}
      width={size}
      height={size}
      className={`rounded-lg object-contain bg-white shrink-0 ${className}`}
      onError={() => setFailed(true)}
    />
  )
}
