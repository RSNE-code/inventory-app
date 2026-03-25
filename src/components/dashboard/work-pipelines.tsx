"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { ClipboardList, Factory } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FabricationSummary } from "@/types"

interface WorkPipelinesProps {
  bomStatusCounts: Record<string, number>
  fabrication: FabricationSummary
  doorQueueCount: number
}

const bomStatuses = [
  { key: "DRAFT", label: "Draft", dot: "bg-text-muted" },
  { key: "PENDING_REVIEW", label: "Review", dot: "bg-brand-orange animate-pulse" },
  { key: "APPROVED", label: "Approved", dot: "bg-brand-blue" },
  { key: "IN_PROGRESS", label: "In Progress", dot: "bg-status-yellow" },
]

export function WorkPipelines({ bomStatusCounts, fabrication, doorQueueCount }: WorkPipelinesProps) {
  const totalActiveBoms = Object.values(bomStatusCounts).reduce((sum, n) => sum + n, 0)

  const fabRows = [
    { label: "In Queue", count: doorQueueCount, dot: "bg-brand-orange" },
    { label: "In Production", count: fabrication.inProduction, dot: "bg-status-yellow animate-pulse" },
    { label: "Completed", count: fabrication.completed, dot: "bg-status-green" },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* BOM Pipeline */}
      <Link href="/boms">
        <Card className="p-5 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] card-accent-blue overflow-hidden h-full">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-blue/12">
              <ClipboardList className="h-4 w-4 text-brand-blue" />
            </div>
            <h4 className="text-sm font-bold text-navy">BOMs</h4>
          </div>
          <div className="space-y-2">
            {bomStatuses.map((s) => {
              const count = bomStatusCounts[s.key] || 0
              if (count === 0) return null
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", s.dot)} />
                  <span className="text-sm font-bold text-navy tabular-nums">{count}</span>
                  <span className="text-xs text-text-muted font-medium">{s.label}</span>
                </div>
              )
            })}
          </div>
          {totalActiveBoms > 0 && (
            <p className="text-xs text-text-muted font-medium mt-3 pt-2 border-t border-border-custom/40">
              {totalActiveBoms} active total
            </p>
          )}
        </Card>
      </Link>

      {/* Fabrication Pipeline */}
      <Link href="/assemblies">
        <Card className="p-5 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] card-accent-orange overflow-hidden h-full">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-orange/12">
              <Factory className="h-4 w-4 text-brand-orange" />
            </div>
            <h4 className="text-sm font-bold text-navy">Fabrication</h4>
          </div>
          <div className="space-y-2">
            {fabRows.map((row) => {
              if (row.count === 0) return null
              return (
                <div key={row.label} className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", row.dot)} />
                  <span className="text-sm font-bold text-navy tabular-nums">{row.count}</span>
                  <span className="text-xs text-text-muted font-medium">{row.label}</span>
                </div>
              )
            })}
          </div>
          {fabrication.pendingApprovals > 0 && (
            <p className="text-xs text-status-yellow font-semibold mt-3 pt-2 border-t border-border-custom/40">
              {fabrication.pendingApprovals} awaiting approval
            </p>
          )}
        </Card>
      </Link>
    </div>
  )
}
