"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepProgressProps {
  steps: string[]
  currentStep: number
  className?: string
  onStepClick?: (stepIndex: number) => void
}

export function StepProgress({ steps, currentStep, className, onStepClick }: StepProgressProps) {
  return (
    <div className={cn("px-2", className)}>
      {/* Top row: circles + connecting lines */}
      <div className="flex items-center">
        {steps.map((label, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isFuture = index > currentStep
          const isClickable = onStepClick && (isCompleted || isCurrent)

          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(index)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all shrink-0",
                  isCompleted && "bg-brand-blue text-white",
                  isCurrent && "bg-brand-blue text-white ring-2 ring-brand-blue/20 ring-offset-2",
                  isFuture && "border-2 border-border-custom text-text-muted",
                  isClickable && !isCurrent && "hover:scale-110 hover:shadow-[0_0_0_3px_rgba(46,125,186,0.15)] active:scale-95 cursor-pointer",
                  !isClickable && "cursor-default"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </button>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 mx-2 rounded-full transition-all duration-500",
                    index < currentStep
                      ? "h-0.5 bg-brand-blue"
                      : "h-[1px] bg-border-custom"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom row: labels */}
      <div className="flex justify-between mt-1.5">
        {steps.map((label, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isFuture = index > currentStep

          return (
            <span
              key={label}
              className={cn(
                "text-[11px] leading-tight text-center w-14 transition-colors",
                isCompleted && "text-brand-blue font-medium",
                isCurrent && "text-brand-blue font-semibold",
                isFuture && "text-text-muted"
              )}
            >
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
