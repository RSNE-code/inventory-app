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
      {/* CSS Grid: equal-width columns for pixel-perfect alignment */}
      <div
        className="grid items-center"
        style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
      >
        {steps.map((_, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isClickable = onStepClick && (isCompleted || isCurrent)

          return (
            <div key={index} className="relative flex items-center justify-center">
              {/* Connecting line — positioned between this circle and the next */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-500",
                    "left-[calc(50%+18px)] right-[calc(-50%+18px)]",
                    index < currentStep
                      ? "h-0.5 bg-brand-blue"
                      : "h-[1px] bg-border-custom"
                  )}
                />
              )}

              {/* Circle */}
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(index)}
                className={cn(
                  "relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all shrink-0",
                  isCompleted && "bg-brand-blue text-white shadow-[0_2px_8px_rgba(46,125,186,0.25)]",
                  isCurrent && "bg-brand-blue text-white ring-2 ring-brand-blue/20 ring-offset-2",
                  !isCompleted && !isCurrent && "border-2 border-border-custom text-text-muted bg-white",
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
            </div>
          )
        })}
      </div>

      {/* Labels row — same grid for perfect centering */}
      <div
        className="grid mt-2"
        style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
      >
        {steps.map((label, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep

          return (
            <span
              key={label}
              className={cn(
                "text-xs leading-tight text-center px-1 transition-colors",
                isCompleted && "text-brand-blue font-medium",
                isCurrent && "text-brand-blue font-semibold",
                !isCompleted && !isCurrent && "text-text-muted"
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
