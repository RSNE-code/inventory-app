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
    <div className={cn("flex items-center justify-between px-2", className)}>
      {steps.map((label, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isFuture = index > currentStep
        const isClickable = onStepClick && (isCompleted || isCurrent)

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(index)}
              className={cn(
                "flex flex-col items-center gap-1 group",
                isClickable && "cursor-pointer",
                !isClickable && "cursor-default"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all shrink-0",
                  isCompleted && "bg-brand-blue text-white",
                  isCurrent && "bg-brand-blue text-white",
                  isFuture && "border-2 border-gray-300 text-gray-400",
                  isClickable && !isCurrent && "group-hover:scale-110 group-hover:shadow-[0_0_0_3px_rgba(46,125,186,0.15)] group-active:scale-95",
                  isClickable && isCurrent && "ring-2 ring-brand-blue/20 ring-offset-2"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-[12px] leading-tight text-center hidden min-[400px]:block transition-colors",
                  isCompleted && "text-brand-blue font-medium",
                  isCurrent && "text-brand-blue font-semibold",
                  isFuture && "text-gray-400",
                  isClickable && !isCurrent && "group-hover:text-navy group-hover:font-semibold"
                )}
              >
                {label}
              </span>
            </button>

            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mt-[-20px] min-[400px]:mt-0 min-[400px]:-translate-y-3",
                  index < currentStep
                    ? "bg-brand-blue"
                    : "bg-gray-200 border-t border-dashed border-gray-300 h-0"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
