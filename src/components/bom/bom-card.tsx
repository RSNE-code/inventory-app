"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { BomStatusBadge } from "./bom-status-badge"
import { ChevronRight } from "lucide-react"

interface BomCardProps {
  id: string
  jobName: string
  status: string
  lineItemCount: number
  createdByName: string
  createdAt: string
}

export function BomCard({ id, jobName, status, lineItemCount, createdByName, createdAt }: BomCardProps) {
  return (
    <Link href={`/boms/${id}`}>
      <Card className="p-4 rounded-xl shadow-brand border-border-custom hover:shadow-brand-md transition-all duration-300 active:scale-[0.98] group">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-navy text-sm leading-tight truncate">{jobName}</h3>
          </div>
          <BomStatusBadge status={status} />
        </div>
        <div className="flex items-end justify-between mt-3">
          <div className="text-xs text-text-muted font-medium">
            <span>{lineItemCount} item{lineItemCount !== 1 ? "s" : ""}</span>
            <span className="mx-1.5 text-border-custom">&middot;</span>
            <span>{createdByName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted tabular-nums">
              {new Date(createdAt).toLocaleDateString()}
            </span>
            <ChevronRight className="h-4 w-4 text-text-muted/30 group-hover:text-text-muted/60 transition-colors" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
