"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useSuppliers } from "@/hooks/use-receiving"
import { SupplierLogo } from "@/components/ui/supplier-logo"

interface SupplierPickerProps {
  onSelect: (supplier: { id: string; name: string; logoUrl?: string | null }) => void
  selectedName?: string
  selectedLogoUrl?: string | null
}

export function SupplierPicker({ onSelect, selectedName, selectedLogoUrl }: SupplierPickerProps) {
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data } = useSuppliers(search.length >= 1 ? search : undefined)
  const suppliers = data?.data || []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (selectedName) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary border border-border-custom">
        <SupplierLogo logoUrl={selectedLogoUrl} name={selectedName} size={28} />
        <div className="flex-1">
          <p className="text-sm font-medium text-navy">{selectedName}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect({ id: "", name: "" })}
          className="text-xs text-brand-blue hover:underline"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          placeholder="Search suppliers..."
          className="pl-9 h-12"
          onFocus={() => {
            setIsOpen(true)
            if (!search) setSearch("")
          }}
        />
      </div>

      {isOpen && suppliers.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border-custom rounded-xl shadow-brand-md max-h-64 overflow-y-auto">
          {suppliers.map((s: { id: string; name: string; logoUrl?: string | null }) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s)
                setSearch("")
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 text-left px-4 py-3 hover:bg-surface-secondary border-b border-border-custom last:border-0 transition-colors"
            >
              <SupplierLogo logoUrl={s.logoUrl} name={s.name} size={24} />
              <p className="text-sm font-medium text-navy">{s.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
