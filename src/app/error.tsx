"use client"

import { AlertCircle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <AlertCircle className="h-12 w-12 text-status-red mb-4" />
      <h2 className="text-xl font-bold text-navy mb-2">Something went wrong</h2>
      <p className="text-text-muted mb-6 max-w-sm">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 text-sm font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-xl"
      >
        Try again
      </button>
    </div>
  )
}
