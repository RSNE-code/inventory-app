import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary mb-4">
        <Icon className="h-8 w-8 text-text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-navy mb-1">{title}</h3>
      <p className="text-text-secondary text-sm max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-4 bg-brand-orange hover:bg-brand-orange-hover text-white"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
