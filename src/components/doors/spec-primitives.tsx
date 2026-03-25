/**
 * spec-primitives.tsx — Shared row and section components for door spec display.
 *
 * Used by: door-confirmation.tsx, door-spec-sheet.tsx, door-manufacturing-sheet.tsx
 * Purpose: Enforce consistent visual structure regardless of data permutations.
 *
 * Rules:
 *  - Every row has identical height (py-2.5 + border divider)
 *  - Empty values show "—", never hidden
 *  - Labels are fixed width, values right-aligned
 *  - Boolean rows match text row height exactly
 */

import { Card } from "@/components/ui/card"
import { Check, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Section Card ────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

/** Card wrapper for a spec section. Title + divider-separated rows. */
export function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <Card className={cn("rounded-xl border-border-custom overflow-hidden", className)}>
      <div className="px-4 pt-3.5 pb-2">
        <h3 className="font-semibold text-navy text-base">{title}</h3>
      </div>
      <div className="divide-y divide-border-custom/30">
        {children}
      </div>
    </Card>
  )
}

// ─── Spec Row (label + value) ────────────────────────────────────────────────

interface SpecRowProps {
  label: string
  value?: string | null
  /** Suffix appended to value (e.g. '"' for inches) */
  suffix?: string
  /** If provided, shows pencil icon and calls this on tap */
  onEdit?: () => void
}

/** Standard label-value row. Identical height whether value exists or not. */
export function SpecRow({ label, value, suffix, onEdit }: SpecRowProps) {
  const displayValue = value ? `${value}${suffix || ""}` : null

  const content = (
    <div className="flex items-center justify-between px-4 py-2.5 min-h-[44px]">
      <span className="text-sm text-text-secondary shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        {displayValue ? (
          <span className="text-sm font-semibold text-navy text-right">{displayValue}</span>
        ) : (
          <EmptyValue />
        )}
        {onEdit && <Pencil className="h-3.5 w-3.5 text-text-muted/40 shrink-0" />}
      </div>
    </div>
  )

  if (onEdit) {
    return (
      <button type="button" onClick={onEdit} className="w-full text-left hover:bg-surface-secondary/50 transition-colors">
        {content}
      </button>
    )
  }

  return content
}

// ─── Bool Row (label + checkbox) ─────────────────────────────────────────────

interface BoolRowProps {
  label: string
  value?: boolean
  /** If provided, row is tappable and calls this on tap */
  onToggle?: () => void
}

/** Boolean row with navy checkbox. Same height as SpecRow. */
export function BoolRow({ label, value, onToggle }: BoolRowProps) {
  const content = (
    <div className="flex items-center justify-between px-4 py-2.5 min-h-[44px]">
      <span className="text-sm text-text-secondary shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn("text-sm font-semibold", value ? "text-navy" : "text-text-muted")}>
          {value ? "Yes" : "No"}
        </span>
        <div
          className={cn(
            "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0",
            value ? "border-navy bg-navy" : "border-border-custom"
          )}
        >
          {value && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>
    </div>
  )

  if (onToggle) {
    return (
      <button type="button" onClick={onToggle} className="w-full text-left hover:bg-surface-secondary/50 transition-colors">
        {content}
      </button>
    )
  }

  return content
}

// ─── Empty Value ─────────────────────────────────────────────────────────────

/** Consistent "—" placeholder for missing values. Never hide a row. */
export function EmptyValue() {
  return <span className="text-sm text-text-muted">—</span>
}
