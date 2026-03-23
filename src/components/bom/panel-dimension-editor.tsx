"use client"

import { useState } from "react"
import { Minus, Plus, Pencil, Check } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useHaptic } from "@/hooks/use-haptic"
import { PANEL_PROFILES, type PanelProfile } from "@/lib/panels"

const WIDTH_OPTIONS = [24, 30, 36, 40, 42, 44, 45, 46]
const COLOR_OPTIONS = ["Igloo White", "White", "Regal White", "Imperial White", "Warm White", "Surrey Beige", "Pearl Gray", "Royal Blue", "Slate Gray", "Driftwood", "Sandstone"]

interface PanelDimensionEditorProps {
  thickness: number
  lengthFt: number
  lengthIn: number
  widthIn?: number
  profile?: string
  color?: string
  onUpdate: (thickness: number, lengthFt: number, lengthIn: number, widthIn?: number, profile?: string, color?: string) => void
}

export function PanelDimensionEditor({
  thickness,
  lengthFt,
  lengthIn,
  widthIn = 44,
  profile = "Mesa",
  color = "Igloo White",
  onUpdate,
}: PanelDimensionEditorProps) {
  const [expanded, setExpanded] = useState(false)
  const haptic = useHaptic()

  const display = lengthIn > 0 ? `${lengthFt}'${lengthIn}"` : `${lengthFt}'`

  function updateThickness(delta: number) {
    const next = Math.min(8, Math.max(2, thickness + delta))
    if (next !== thickness) haptic.light()
    onUpdate(next, lengthFt, lengthIn, widthIn, profile, color)
  }

  function updateLengthFt(val: string) {
    const n = parseInt(val) || 0
    const clamped = Math.min(50, Math.max(1, n))
    onUpdate(thickness, clamped, lengthIn, widthIn, profile, color)
  }

  function updateLengthIn(delta: number) {
    haptic.light()
    const next = lengthIn + delta
    if (next < 0) {
      if (lengthFt > 1) onUpdate(thickness, lengthFt - 1, 11, widthIn, profile, color)
    } else if (next > 11) {
      onUpdate(thickness, lengthFt + 1, 0, widthIn, profile, color)
    } else {
      onUpdate(thickness, lengthFt, next, widthIn, profile, color)
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => { setExpanded(true); haptic.light() }}
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 rounded-xl",
          "bg-brand-blue/10 border border-brand-blue/30",
          "text-sm font-semibold text-brand-blue",
          "min-h-[44px]",
          "ios-press transition-all duration-200"
        )}
      >
        <span>{thickness}" × {display} · {widthIn}"w · {profile} · {color}</span>
        <Pencil className="h-3.5 w-3.5 opacity-60" />
      </button>
    )
  }

  return (
    <div className={cn(
      "rounded-xl bg-brand-blue/10 border border-brand-blue/30 p-3",
      "animate-ios-spring-in",
      "space-y-3"
    )}>
      {/* Thickness */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Thickness</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateThickness(-1)}
            disabled={thickness <= 2}
            className={cn(
              "h-10 w-10 flex items-center justify-center rounded-lg",
              "bg-white border border-border-custom",
              "disabled:opacity-30 ios-press transition-all shrink-0"
            )}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="text-base font-bold text-navy tabular-nums w-10 text-center">{thickness}&Prime;</span>
          <button
            type="button"
            onClick={() => updateThickness(1)}
            disabled={thickness >= 8}
            className={cn(
              "h-10 w-10 flex items-center justify-center rounded-lg",
              "bg-white border border-border-custom",
              "disabled:opacity-30 ios-press transition-all shrink-0"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Cut Length — feet and inches */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Cut Length</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={lengthFt}
              onChange={(e) => updateLengthFt(e.target.value)}
              min={1}
              max={50}
              className={cn(
                "h-10 w-12 text-center text-base font-bold text-navy",
                "border border-border-custom rounded-lg bg-white tabular-nums",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              )}
            />
            <span className="text-sm font-bold text-navy">ft</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => updateLengthIn(-1)}
              className={cn(
                "h-10 w-10 flex items-center justify-center rounded-lg",
                "bg-white border border-border-custom ios-press transition-all shrink-0"
              )}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-base font-bold text-navy tabular-nums w-8 text-center">{lengthIn}&Prime;</span>
            <button
              type="button"
              onClick={() => updateLengthIn(1)}
              className={cn(
                "h-10 w-10 flex items-center justify-center rounded-lg",
                "bg-white border border-border-custom ios-press transition-all shrink-0"
              )}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Width + Profile row */}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Width</span>
          <Select value={String(widthIn)} onValueChange={(v) => onUpdate(thickness, lengthFt, lengthIn, parseInt(v), profile, color)}>
            <SelectTrigger className="h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WIDTH_OPTIONS.map((w) => (
                <SelectItem key={w} value={String(w)}>{w}&quot;</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Profile</span>
          <Select value={profile} onValueChange={(v) => onUpdate(thickness, lengthFt, lengthIn, widthIn, v as PanelProfile, color)}>
            <SelectTrigger className="h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PANEL_PROFILES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Color row */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Color</span>
        <Select value={color} onValueChange={(v) => onUpdate(thickness, lengthFt, lengthIn, widthIn, profile, v)}>
          <SelectTrigger className="h-10 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLOR_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Done */}
      <button
        type="button"
        onClick={() => { setExpanded(false); haptic.success() }}
        className={cn(
          "w-full flex items-center justify-center gap-2",
          "h-11 rounded-xl",
          "bg-brand-blue text-white font-semibold text-sm",
          "ios-press transition-all"
        )}
      >
        <Check className="h-4 w-4" />
        Done
      </button>
    </div>
  )
}
