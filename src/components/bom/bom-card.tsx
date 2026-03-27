"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { BomStatusBadge } from "./bom-status-badge"
import { ChevronRight, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

interface BomCardProps {
  id: string
  jobName: string
  jobNumber?: string | null
  status: string
  lineItemCount: number
  createdByName: string
  createdAt: string
  sequenceLabel?: string | null
  unfabricatedAssemblyCount?: number
}

const statusAccent: Record<string, string> = {
  DRAFT: "card-accent-gray",
  PENDING_REVIEW: "card-accent-orange",
  APPROVED: "card-accent-blue",
  IN_PROGRESS: "card-accent-yellow",
  COMPLETED: "card-accent-green",
  CANCELLED: "card-accent-red",
}

export function BomCard({ id, jobName, jobNumber, status, lineItemCount, createdByName, createdAt, sequenceLabel, unfabricatedAssemblyCount = 0 }: BomCardProps) {
  return (
    <Link href={`/boms/${id}`}>
      <Card className={cn("p-4 rounded-xl shadow-brand border-border-custom hover:shadow-brand-md hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] group overflow-hidden", statusAccent[status] || "card-accent-gray")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-navy text-base leading-tight">
              {jobName}
              {sequenceLabel && (
                <span className="text-text-muted font-normal"> — {sequenceLabel}</span>
              )}
            </h3>
            {jobNumber && (
              <p className="text-xs text-text-muted mt-0.5">Job #{jobNumber}</p>
            )}
          </div>
          <BomStatusBadge status={status} />
        </div>
        {unfabricatedAssemblyCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold bg-brand-blue/10 text-brand-blue">
              <Wrench className="h-3 w-3" />
              {unfabricatedAssemblyCount} fab item{unfabricatedAssemblyCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
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
            <ChevronRight className="h-4 w-4 text-text-muted/30 group-hover:text-brand-blue group-hover:translate-x-1 transition-all duration-300" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
