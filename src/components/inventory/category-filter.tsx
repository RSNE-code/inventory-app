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
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect("")}
        className={cn(
          "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
          selected === ""
            ? "bg-brand-blue text-white shadow-[0_2px_6px_rgba(46,125,186,0.25)]"
            : "bg-surface-secondary text-text-secondary hover:bg-border-custom"
        )}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 whitespace-nowrap",
            selected === cat.id
              ? "bg-brand-blue text-white shadow-[0_2px_6px_rgba(46,125,186,0.25)]"
              : "bg-surface-secondary text-text-secondary hover:bg-border-custom"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
