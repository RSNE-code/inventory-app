import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl skeleton-shimmer", className)} />
  )
}

export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-border-custom/60 p-4 space-y-3", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-end justify-between pt-1">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 5, className }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} className={`animate-fade-in-up stagger-${Math.min(i + 1, 8)}`} />
      ))}
    </div>
  )
}
