"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { TapeMeasureInput, TapeMeasureTrigger } from "./tape-measure-input"
import { parseFractionalInches } from "@/lib/door-specs"

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
          className="text-text-muted -ml-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      )}

      <div className="text-center space-y-2 px-2">
        <h2 className="text-xl font-bold text-navy">{question}</h2>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
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
          ? "border-brand-blue bg-brand-blue/8 text-brand-blue"
          : "border-border-custom bg-white text-navy hover:border-brand-blue/40 hover:bg-brand-blue/8/50"
      }`}
    >
      {label}
    </button>
  )
}

/** Dimension input with tape measure picker */
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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [manualMode, setManualMode] = useState(false)

  const numValue = parseFractionalInches(value)
  const isValid = value.trim().length > 0 && numValue > 0

  if (manualMode) {
    return (
      <div className="space-y-2">
        {label && <label className="text-sm text-text-secondary">{label}</label>}
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid) onSubmit()
            }}
            placeholder={placeholder || 'e.g. 36-3/16'}
            className="flex-1 h-14 text-center text-2xl font-bold rounded-xl border-2 border-border-custom focus:border-brand-blue focus:outline-none transition-colors"
            autoFocus
          />
          {unit && (
            <span className="text-lg text-text-muted font-medium w-8">{unit}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => setManualMode(false)}
            className="text-text-muted text-sm"
          >
            Use tape measure
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!isValid}
            className="flex-1 h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl"
          >
            Next
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <TapeMeasureTrigger
        value={value}
        label={label}
        placeholder={placeholder || "Tap to measure"}
        onOpen={() => setPickerOpen(true)}
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="text-xs text-text-muted underline underline-offset-2"
        >
          Type manually
        </button>
      </div>

      <Button
        onClick={onSubmit}
        disabled={!isValid}
        className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl"
      >
        Next
      </Button>

      <TapeMeasureInput
        value={value}
        onChange={onChange}
        label={label || "Dimension"}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
      />
    </div>
  )
}
