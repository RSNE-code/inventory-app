"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-200" },
  APPROVED: { label: "Approved", className: "bg-blue-50 text-blue-700 border-blue-200" },
  IN_PROGRESS: { label: "In Progress", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  COMPLETED: { label: "Completed", className: "bg-green-50 text-green-700 border-green-200" },
  CANCELLED: { label: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
}

export function BomStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.DRAFT
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  )
}
