"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

interface InterviewStepProps {
  question: string
  description?: string
  children: React.ReactNode
  onBack?: () => void
  diagram?: React.ReactNode
}

export function InterviewStep({
  question,
  description,
  children,
  onBack,
  diagram,
}: InterviewStepProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-400 -ml-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      )}

      <div className="text-center space-y-2 px-2">
        <h2 className="text-xl font-bold text-navy">{question}</h2>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>

      {diagram && (
        <div className="flex justify-center py-2">{diagram}</div>
      )}

      <div className="space-y-3">{children}</div>
    </div>
  )
}

/** Large tappable choice button for binary/multi-choice questions */
export function ChoiceButton({
  label,
  selected,
  onClick,
}: {
  label: string
  selected?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-4 px-6 rounded-xl border-2 text-base font-semibold transition-all ${
        selected
          ? "border-brand-blue bg-blue-50 text-brand-blue"
          : "border-gray-200 bg-white text-navy hover:border-blue-300 hover:bg-blue-50/50"
      }`}
    >
      {label}
    </button>
  )
}

/** Numeric dimension input with unit label */
export function DimensionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  unit,
  label,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  placeholder?: string
  unit?: string
  label?: string
}) {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm text-gray-500">{label}</label>}
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onSubmit()
          }}
          placeholder={placeholder || 'e.g. 36"'}
          className="flex-1 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-brand-blue focus:outline-none transition-colors"
          autoFocus
        />
        {unit && (
          <span className="text-lg text-gray-400 font-medium w-8">{unit}</span>
        )}
      </div>
      <Button
        onClick={onSubmit}
        disabled={!value.trim()}
        className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl mt-2"
      >
        Next
      </Button>
    </div>
  )
}
