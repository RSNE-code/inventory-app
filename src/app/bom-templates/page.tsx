"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, FileStack } from "lucide-react"
import { useBomTemplates } from "@/hooks/use-bom-templates"
import { Header } from "@/components/layout/header"
import { SearchInput } from "@/components/shared/search-input"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton } from "@/components/shared/skeleton"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BomTemplatesPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")

  const { data, isLoading } = useBomTemplates({ search })
  const templates = data?.data || []
  const total = data?.total || 0

  return (
    <div>
      <Header title="BOM Templates" />

      <div className="p-4 space-y-3">
        <SearchInput
          value={search}
          onChange={(v) => setSearch(v)}
          placeholder="Search templates..."
        />
      </div>

      <div className="px-4 space-y-3 pb-24">
        {isLoading ? (
          <ListSkeleton count={5} />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={FileStack}
            title="No templates found"
            description={search ? "Try a different search" : "Create reusable BOM templates to speed up job setup"}
            actionLabel={!search ? "Create Template" : undefined}
            onAction={!search ? () => router.push("/bom-templates/new") : undefined}
          />
        ) : (
          <>
            <p className="text-text-muted text-xs font-semibold uppercase tracking-wide">
              {total} Template{total !== 1 ? "s" : ""}
            </p>
            {templates.map((template: Record<string, unknown>, i: number) => {
              const lineItems = template.lineItems as unknown[] | undefined
              const itemCount = template._count
                ? (template._count as Record<string, number>).lineItems || 0
                : lineItems?.length || 0
              const description = template.description as string | null
              const createdAt = template.createdAt as string

              return (
                <div
                  key={template.id as string}
                  className={`animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}
                >
                  <Card
                    className="p-4 rounded-xl border-border-custom cursor-pointer hover:border-brand-blue/30 transition-all active:scale-[0.98]"
                    onClick={() => router.push(`/bom-templates/${template.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-navy truncate">
                          {template.name as string}
                        </h3>
                        {description && (
                          <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
                            {description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end justify-between mt-3 pt-2 border-t border-border-custom/40">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-navy tabular-nums">
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="text-xs text-text-muted">
                        {new Date(createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                </div>
              )
            })}
          </>
        )}
      </div>

      <Button
        onClick={() => router.push("/bom-templates/new")}
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white shadow-[0_4px_14px_rgba(232,121,43,0.35)] hover:shadow-[0_6px_20px_rgba(232,121,43,0.45)] z-30 transition-all duration-300 md:bottom-6"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  )
}
