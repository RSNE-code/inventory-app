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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="relative mb-5">
        <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-brand-blue/10">
          <Icon className="h-8 w-8 text-brand-blue" />
        </div>
        {/* Decorative ring */}
        <div className="absolute -inset-2 rounded-3xl border-2 border-dashed border-brand-blue/20" />
      </div>
      <h3 className="text-xl font-bold text-navy mb-1 tracking-tight">{title}</h3>
      <p className="text-text-secondary text-sm max-w-[260px] leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-5 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold rounded-xl px-6 shadow-[0_2px_8px_rgba(232,121,43,0.25)]"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
