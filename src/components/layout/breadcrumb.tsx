"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1.5 px-4 py-2 bg-surface-secondary text-xs text-text-muted overflow-x-auto",
        className
      )}
    >
      <Link
        href="/"
        className="shrink-0 hover:text-brand-blue transition-colors"
      >
        Home
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5 min-w-0">
            <ChevronRight className="h-3 w-3 shrink-0 text-gray-300" />
            {isLast || !item.href ? (
              <span className="font-medium text-text-secondary truncate">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="shrink-0 hover:text-brand-blue transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
