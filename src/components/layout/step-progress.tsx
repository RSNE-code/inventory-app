"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepProgressProps {
  steps: string[]
  currentStep: number
  className?: string
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  return (
    <div className={cn("flex items-center justify-between px-2", className)}>
      {steps.map((label, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isFuture = index > currentStep

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors shrink-0",
                  isCompleted && "bg-brand-blue text-white",
                  isCurrent && "bg-brand-blue text-white",
                  isFuture && "border-2 border-gray-300 text-gray-400"
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
                  "text-[11px] leading-tight text-center hidden min-[400px]:block",
                  isCompleted && "text-brand-blue font-medium",
                  isCurrent && "text-brand-blue font-semibold",
                  isFuture && "text-gray-400"
                )}
              >
                {label}
              </span>
            </div>

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
