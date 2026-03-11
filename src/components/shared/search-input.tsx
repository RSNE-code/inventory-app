"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRef, useEffect } from "react"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: SearchInputProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => onChange(val), 300)
  }

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted/60" />
      <Input
        defaultValue={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-11 pl-9 bg-surface-secondary border-border-custom/60 rounded-xl focus:border-brand-blue/30 transition-all"
      />
    </div>
  )
}
