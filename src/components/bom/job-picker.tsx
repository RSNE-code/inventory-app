"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search, Briefcase, MapPin } from "lucide-react"
import { useJobs } from "@/hooks/use-jobs"

interface Job {
  id: string
  name: string
  number: string | null
  client: string | null
  city: string | null
}

interface JobPickerProps {
  onSelect: (job: { id: string; name: string; number: string | null }) => void
  selectedName?: string
  selectedNumber?: string | null
}

export function JobPicker({ onSelect, selectedName, selectedNumber }: JobPickerProps) {
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data } = useJobs(search.length >= 1 ? search : "")
  const jobs: Job[] = data?.data || []

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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10">
          <Briefcase className="h-4 w-4 text-brand-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-navy truncate">{selectedName}</p>
          {selectedNumber && (
            <p className="text-xs text-text-muted font-medium">#{selectedNumber}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSelect({ id: "", name: "", number: null })}
          className="text-xs text-brand-blue hover:underline font-semibold"
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
          placeholder="Search jobs..."
          className="pl-9 h-12"
          onFocus={() => {
            setIsOpen(true)
            if (!search) setSearch("")
          }}
        />
      </div>

      {isOpen && jobs.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border-custom rounded-xl shadow-brand-md max-h-64 overflow-y-auto">
          {jobs.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => {
                onSelect({ id: job.id, name: job.name, number: job.number })
                setSearch("")
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 text-left px-4 py-3 hover:bg-surface-secondary border-b border-border-custom/40 last:border-0 transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10">
                <Briefcase className="h-3.5 w-3.5 text-brand-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-navy truncate">{job.name}</p>
                <div className="flex items-center gap-2 text-xs text-text-muted font-medium">
                  {job.number && <span>#{job.number}</span>}
                  {job.client && (
                    <>
                      {job.number && <span className="text-text-muted/40">&middot;</span>}
                      <span>{job.client}</span>
                    </>
                  )}
                  {job.city && (
                    <>
                      <span className="text-text-muted/40">&middot;</span>
                      <MapPin className="h-3 w-3 inline" />
                      <span>{job.city}</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && search.length >= 1 && jobs.length === 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border-custom rounded-xl shadow-brand-md px-4 py-3">
          <p className="text-sm text-text-muted">No matching jobs found</p>
        </div>
      )}
    </div>
  )
}
