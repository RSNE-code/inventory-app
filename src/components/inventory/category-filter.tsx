"use client"

import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
}

interface CategoryFilterProps {
  categories: Category[]
  selected: string
  onSelect: (id: string) => void
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect("")}
        className={cn(
          "shrink-0 rounded-full px-4 py-2.5 min-h-[44px] text-xs font-semibold transition-all duration-300",
          selected === ""
            ? "bg-brand-blue text-white shadow-[0_2px_6px_rgba(46,125,186,0.25)]"
            : "bg-white border border-border-custom text-navy hover:bg-surface-secondary"
        )}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2.5 min-h-[44px] text-xs font-semibold transition-all duration-300 whitespace-nowrap",
            selected === cat.id
              ? "bg-brand-blue text-white shadow-[0_2px_6px_rgba(46,125,186,0.25)]"
              : "bg-white border border-border-custom text-navy hover:bg-surface-secondary"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
