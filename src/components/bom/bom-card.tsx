"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { BomStatusBadge } from "./bom-status-badge"

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
      <Card className="p-4 rounded-xl shadow-sm border-border-custom hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-navy text-sm leading-tight truncate">{jobName}</h3>
          </div>
          <BomStatusBadge status={status} />
        </div>
        <div className="flex items-end justify-between mt-3">
          <div className="text-xs text-text-muted">
            <span>{lineItemCount} item{lineItemCount !== 1 ? "s" : ""}</span>
            <span className="mx-1">&middot;</span>
            <span>{createdByName}</span>
          </div>
          <span className="text-xs text-text-muted">
            {new Date(createdAt).toLocaleDateString()}
          </span>
        </div>
      </Card>
    </Link>
  )
}
