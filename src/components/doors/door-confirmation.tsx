"use client"

import { useState } from "react"
import type { DoorSpecs } from "@/lib/door-specs"
import { FIELD_METADATA, calculateHeaterCable } from "@/lib/door-specs"
import { formatDoorFieldValue, splitHardwareValue } from "@/lib/door-field-labels"
import { SectionCard, SpecRow, BoolRow } from "./spec-primitives"
import { TapeMeasureInput } from "./tape-measure-input"
import { OptionPicker } from "./option-picker"
import type { PickerWheel } from "./option-picker"
import {
  SWING_HINGES, SWING_LATCHES, SWING_CLOSERS, SWING_INSIDE_RELEASE,
  SLIDER_HARDWARE, SLIDER_ROLLERS, SLIDER_STRIKE_TONGUE,
  hardwareToPickerOptions,
} from "@/lib/door-hardware-catalog"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AIInput } from "@/components/ai/ai-input"
import { cn, formatQuantity } from "@/lib/utils"
import {
  Check,
  X,
  Mic,
  Trash2,
  Factory,
} from "lucide-react"
import type { ParseResult, ReceivingParseResult } from "@/lib/ai/types"

interface ComponentItem {
  productId: string
  productName: string
  unitOfMeasure: string
  qtyUsed: number
  currentQty: number
}

interface DoorConfirmationProps {
  specs: Partial<DoorSpecs>
  onSpecChange: (field: string, value: unknown) => void
  components: ComponentItem[]
  onComponentChange: (index: number, qty: number) => void
  onRemoveComponent: (index: number) => void
  onAddComponents: (result: ParseResult | ReceivingParseResult) => void
  jobName: string
  jobNumber: string
  onJobNameChange: (name: string) => void
  notes: string
  onNotesChange: (notes: string) => void
  onSubmit: () => void
  isSubmitting: boolean
  onBack: () => void
}

export function DoorConfirmation({
  specs,
  onSpecChange,
  components,
  onComponentChange,
  onRemoveComponent,
  onAddComponents,
  jobName,
  jobNumber,
  notes,
  onNotesChange,
  onSubmit,
  isSubmitting,
  onBack,
}: DoorConfirmationProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [measureField, setMeasureField] = useState<string | null>(null)
  const [activePicker, setActivePicker] = useState<string | null>(null)

  // ── Edit helpers (for free-text inline edits only) ──

  function startEdit(field: string, value: unknown) {
    setEditingField(field)
    setEditValue(value != null ? String(value) : "")
  }

  function saveEdit() {
    if (!editingField) return
    const meta = FIELD_METADATA[editingField]
    let finalValue: unknown = editValue.trim()
    if (meta?.type === "checkbox") {
      finalValue = editValue.toLowerCase() === "true" || editValue === "Yes"
    } else if (meta?.type === "number") {
      finalValue = Number(editValue) || 0
    }
    onSpecChange(editingField, finalValue || undefined)
    if (["widthInClear", "heightInClear", "highSill"].includes(editingField) && specs.temperatureType === "FREEZER") {
      const updated = { ...specs, [editingField]: finalValue }
      const cable = calculateHeaterCable(updated)
      if (cable) onSpecChange("heaterSize", cable)
    }
    setEditingField(null)
    setEditValue("")
  }

  function cancelEdit() {
    setEditingField(null)
    setEditValue("")
  }

  function toggleBoolean(field: string) {
    const current = specs[field as keyof DoorSpecs]
    onSpecChange(field, !current)
    if (field === "highSill") {
      onSpecChange("wiper", current)
      if (!current && specs.temperatureType === "FREEZER") {
        const updated = { ...specs, highSill: true }
        const cable = calculateHeaterCable(updated)
        if (cable) onSpecChange("heaterSize", cable)
      }
    }
    if (field === "wiper") onSpecChange("highSill", current)
  }

  function EditRow({ field }: { field: string }) {
    if (editingField !== field) return null
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-surface-secondary/50">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="h-9 text-sm flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit()
            if (e.key === "Escape") cancelEdit()
          }}
        />
        <Button size="sm" onClick={saveEdit} className="h-9 px-3 bg-brand-blue text-white">
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-9 px-3">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  // ── Derived state ──

  const isSlider = specs.doorCategory === "SLIDING"
  const isFreezer = specs.temperatureType === "FREEZER"
  const closerHw = splitHardwareValue(specs.closerModel)
  const releaseHw = splitHardwareValue(specs.insideRelease)

  // ── Picker config builder ──

  function getPickerConfig(field: string): { label: string; wheels: PickerWheel[]; values: string[]; allowOther?: boolean; getFiltered?: (wi: number, vals: string[]) => { label: string; value: string }[] } | null {
    switch (field) {
      case "temperatureType":
        return {
          label: "Temperature",
          wheels: [{ label: "Type", options: [{ label: "Cooler", value: "COOLER" }, { label: "Freezer", value: "FREEZER" }] }],
          values: [specs.temperatureType || "COOLER"],
        }
      case "frameType":
        return {
          label: "Frame Type",
          wheels: [{ label: "Frame", options: [{ label: "Full Frame", value: "FULL_FRAME" }, { label: "Face Frame", value: "FACE_FRAME" }, { label: "Bally Type", value: "BALLY_TYPE" }] }],
          values: [specs.frameType || "FULL_FRAME"],
        }
      case "hingeSide":
        return {
          label: "Hinge Side",
          wheels: [{ label: "Side", options: [{ label: "Right", value: "RIGHT" }, { label: "Left", value: "LEFT" }] }],
          values: [specs.hingeSide || "RIGHT"],
        }
      case "slideSide":
        return {
          label: "Slide Side",
          wheels: [{ label: "Side", options: [{ label: "Right", value: "RIGHT" }, { label: "Left", value: "LEFT" }] }],
          values: [specs.slideSide || "RIGHT"],
        }
      case "finish":
        return {
          label: "Finish",
          wheels: [{ label: "Finish", options: [{ label: "WPG", value: "WPG" }, { label: "Stainless Steel", value: "SS" }, { label: "Gray", value: "Gray" }] }],
          values: [specs.finish || "WPG"],
          allowOther: true,
        }
      case "insulationType": {
        const opts = isSlider
          ? [{ label: "IMP", value: "IMP" }]
          : [{ label: "EPS", value: "EPS" }, { label: "PIR", value: "PIR" }]
        return {
          label: "Insulation Type",
          wheels: [{ label: "Type", options: opts }],
          values: [specs.insulationType || (isSlider ? "IMP" : "EPS")],
          allowOther: isSlider,
        }
      }
      case "gasketType":
        return {
          label: "Gasket Type",
          wheels: [{ label: "Type", options: [{ label: "Magnetic", value: "MAGNETIC" }, { label: "Neoprene", value: "NEOPRENE" }] }],
          values: [specs.gasketType || "MAGNETIC"],
        }
      case "windowSize":
        return {
          label: "Window",
          wheels: [
            { label: "Height", options: [{ label: "None", value: "" }, { label: '14"', value: "14" }] },
            { label: "Width", options: [{ label: '14"', value: "14" }, { label: '24"', value: "24" }] },
            { label: "Heated", options: [{ label: "Non-Heated", value: "no" }, { label: "Heated", value: "yes" }] },
          ],
          values: [
            specs.windowSize ? "14" : "",
            specs.windowSize === "14x24" ? "24" : "14",
            specs.windowHeated ? "yes" : "no",
          ],
        }
      // ── Swing hardware ──
      case "hinges": {
        const cat = hardwareToPickerOptions(SWING_HINGES)
        return {
          label: "Hinges",
          wheels: [
            { label: "Manufacturer", options: cat.manufacturers },
            { label: "Part", options: cat.partsByMfr[specs.hingeMfrName || "DENT"] || [] },
          ],
          values: [specs.hingeMfrName || "DENT", specs.hingeModel || ""],
          getFiltered: (wi, vals) => {
            if (wi === 1) return cat.partsByMfr[vals[0]] || []
            return cat.manufacturers
          },
        }
      }
      case "latch": {
        const cat = hardwareToPickerOptions(SWING_LATCHES)
        return {
          label: "Latch",
          wheels: [
            { label: "Manufacturer", options: cat.manufacturers },
            { label: "Part", options: cat.partsByMfr[specs.latchMfrName || "DENT"] || [] },
          ],
          values: [specs.latchMfrName || "DENT", specs.latchModel || ""],
          getFiltered: (wi, vals) => {
            if (wi === 1) return cat.partsByMfr[vals[0]] || []
            return cat.manufacturers
          },
        }
      }
      case "closer": {
        const cat = hardwareToPickerOptions(SWING_CLOSERS)
        const noneOpt = { label: "None", value: "" }
        return {
          label: "Closer",
          wheels: [
            { label: "Manufacturer", options: [...cat.manufacturers, noneOpt] },
            { label: "Part", options: [...(cat.partsByMfr[closerHw.manufacturer || "DENT"] || []), noneOpt] },
          ],
          values: [closerHw.manufacturer || "", closerHw.model || ""],
          getFiltered: (wi, vals) => {
            if (wi === 1) {
              if (!vals[0]) return [noneOpt]
              return [...(cat.partsByMfr[vals[0]] || []), noneOpt]
            }
            return [...cat.manufacturers, noneOpt]
          },
        }
      }
      case "insideRelease": {
        const cat = hardwareToPickerOptions(SWING_INSIDE_RELEASE)
        const noneOpt = { label: "None", value: "" }
        return {
          label: "Inside Release",
          wheels: [
            { label: "Manufacturer", options: [...cat.manufacturers, { label: "—", value: "" }, noneOpt] },
            { label: "Part", options: [...(cat.partsByMfr[releaseHw.manufacturer || "Kason"] || [{ label: "Glow Push Panel", value: "Glow Push Panel" }]), noneOpt] },
          ],
          values: [releaseHw.manufacturer || "", releaseHw.model || ""],
          getFiltered: (wi, vals) => {
            if (wi === 1) {
              if (!vals[0]) return [{ label: "Glow Push Panel", value: "Glow Push Panel" }, noneOpt]
              return [...(cat.partsByMfr[vals[0]] || []), noneOpt]
            }
            return [...cat.manufacturers, { label: "—", value: "" }, noneOpt]
          },
        }
      }
      // ── Slider hardware ──
      case "sliderHardware": {
        const cat = hardwareToPickerOptions(SLIDER_HARDWARE)
        return {
          label: "Sliding Hardware",
          wheels: [
            { label: "Manufacturer", options: cat.manufacturers },
            { label: "Part", options: cat.partsByMfr["Kason"] || [] },
          ],
          values: ["Kason", specs.doorPull || ""],
          getFiltered: (wi, vals) => {
            if (wi === 1) return cat.partsByMfr[vals[0]] || []
            return cat.manufacturers
          },
        }
      }
      case "sliderRoller": {
        const cat = hardwareToPickerOptions(SLIDER_ROLLERS)
        return {
          label: "Roller",
          wheels: [
            { label: "Manufacturer", options: cat.manufacturers },
            { label: "Part", options: cat.partsByMfr["Kason"] || [] },
          ],
          values: ["Kason", "HD Floor Roller"],
        }
      }
      case "sliderStrike": {
        const cat = hardwareToPickerOptions(SLIDER_STRIKE_TONGUE)
        return {
          label: "Strike / Tongue",
          wheels: [
            { label: "Manufacturer", options: cat.manufacturers },
            { label: "Part", options: cat.partsByMfr["Kason"] || [] },
          ],
          values: ["Kason", specs.trackType || ""],
          getFiltered: (wi, vals) => {
            if (wi === 1) return cat.partsByMfr[vals[0]] || []
            return cat.manufacturers
          },
        }
      }
      default:
        return null
    }
  }

  // ── Picker done handler ──

  function handlePickerDone(field: string, values: string[]) {
    switch (field) {
      case "temperatureType":
        onSpecChange("temperatureType", values[0])
        if (values[0] === "FREEZER") {
          const cable = calculateHeaterCable({ ...specs, temperatureType: "FREEZER" })
          if (cable) onSpecChange("heaterSize", cable)
        }
        break
      case "frameType":
        onSpecChange("frameType", values[0])
        break
      case "hingeSide":
        onSpecChange("hingeSide", values[0])
        break
      case "slideSide":
        onSpecChange("slideSide", values[0])
        break
      case "finish":
        onSpecChange("finish", values[0])
        break
      case "insulationType":
        onSpecChange("insulationType", values[0])
        break
      case "gasketType":
        onSpecChange("gasketType", values[0])
        break
      case "windowSize":
        if (!values[0]) {
          onSpecChange("windowSize", undefined)
          onSpecChange("windowHeated", undefined)
        } else {
          const size = `${values[0]}x${values[1]}` as "14x14" | "14x24"
          onSpecChange("windowSize", size)
          onSpecChange("windowHeated", values[2] === "yes")
        }
        break
      case "hinges":
        onSpecChange("hingeMfrName", values[0])
        onSpecChange("hingeModel", values[1])
        break
      case "latch":
        onSpecChange("latchMfrName", values[0])
        onSpecChange("latchModel", values[1])
        break
      case "closer":
        if (!values[0] && !values[1]) {
          onSpecChange("closerModel", undefined)
        } else {
          onSpecChange("closerModel", [values[0], values[1]].filter(Boolean).join(" "))
        }
        break
      case "insideRelease":
        if (!values[1]) {
          onSpecChange("insideRelease", undefined)
        } else {
          onSpecChange("insideRelease", values[1])
        }
        break
      case "sliderHardware":
        onSpecChange("doorPull", values[1])
        break
      case "sliderRoller":
        // Roller is standard — no separate spec field, stored in components
        break
      case "sliderStrike":
        onSpecChange("trackType", values[1])
        break
    }
    setActivePicker(null)
  }

  // ── Active picker rendering ──

  const pickerConfig = activePicker ? getPickerConfig(activePicker) : null

  return (
    <div className="space-y-3 overscroll-fix">
      {/* Job badge — shows Job # first, then name */}
      {(jobName || jobNumber) && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-navy/8 rounded-xl">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Job</span>
          {jobNumber && <span className="text-sm font-bold text-navy">#{jobNumber}</span>}
          {jobNumber && jobName && <span className="text-text-muted">·</span>}
          {jobName && <span className="text-sm font-medium text-navy">{jobName}</span>}
        </div>
      )}

      {/* ── SECTION 1: Dimensions (tape measure picker) ── */}
      <SectionCard title="Dimensions">
        <SpecRow label="Width (in clear)" value={specs.widthInClear} suffix='"' onEdit={() => setMeasureField("widthInClear")} />
        <SpecRow label="Height (in clear)" value={specs.heightInClear} suffix='"' onEdit={() => setMeasureField("heightInClear")} />
        <SpecRow label="Jamb Depth" value={specs.jambDepth} suffix='"' onEdit={() => setMeasureField("jambDepth")} />
        <SpecRow label="Wall Thickness" value={specs.wallThickness} suffix='"' onEdit={() => setMeasureField("wallThickness")} />
      </SectionCard>

      {measureField && <TapeMeasureInput
        key={measureField}
        value={String(specs[measureField as keyof DoorSpecs] || "")}
        onChange={(v) => {
          if (measureField) {
            onSpecChange(measureField, v || undefined)
            if (["widthInClear", "heightInClear"].includes(measureField) && isFreezer) {
              const updated = { ...specs, [measureField]: v }
              const cable = calculateHeaterCable(updated)
              if (cable) onSpecChange("heaterSize", cable)
            }
          }
        }}
        label={
          measureField === "widthInClear" ? "Width (in clear)" :
          measureField === "heightInClear" ? "Height (in clear)" :
          measureField === "jambDepth" ? "Jamb Depth" :
          measureField === "wallThickness" ? "Wall Thickness" : "Dimension"
        }
        open={true}
        onOpenChange={(open) => { if (!open) setMeasureField(null) }}
      />}

      {/* ── SECTION 2: Configuration (scroll pickers) ── */}
      <SectionCard title="Configuration">
        <SpecRow label="Temperature" value={formatDoorFieldValue("temperatureType", specs.temperatureType)} onEdit={() => setActivePicker("temperatureType")} />
        <SpecRow label="Opening Type" value={formatDoorFieldValue("openingType", specs.openingType)} />
        {!isSlider && (
          <SpecRow label="Frame Type" value={formatDoorFieldValue("frameType", specs.frameType)} onEdit={() => setActivePicker("frameType")} />
        )}
        {isSlider ? (
          <SpecRow label="Slide Side" value={formatDoorFieldValue("slideSide", specs.slideSide)} onEdit={() => setActivePicker("slideSide")} />
        ) : (
          <SpecRow label="Hinge Side" value={formatDoorFieldValue("hingeSide", specs.hingeSide)} onEdit={() => setActivePicker("hingeSide")} />
        )}
        <SpecRow label="Finish" value={specs.finish} onEdit={() => setActivePicker("finish")} />
        <SpecRow label="Insulation Type" value={specs.insulationType} onEdit={() => setActivePicker("insulationType")} />
        {!isSlider && (
          <SpecRow label="Gasket Type" value={formatDoorFieldValue("gasketType", specs.gasketType)} onEdit={() => setActivePicker("gasketType")} />
        )}
        <BoolRow label="High Sill" value={specs.highSill} onToggle={() => toggleBoolean("highSill")} />
        <BoolRow label="Wiper" value={specs.wiper} onToggle={() => toggleBoolean("wiper")} />
        <BoolRow label="Exterior Door" value={specs.isExterior} onToggle={() => toggleBoolean("isExterior")} />
      </SectionCard>

      {/* ── SECTION 3: Hardware (scroll pickers) ── */}
      <SectionCard title="Hardware">
        {!isSlider ? (
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              <HwBox title="Hinges" mfr={specs.hingeMfrName} model={specs.hingeModel} offset={specs.hingeOffset} onEdit={() => setActivePicker("hinges")} />
              <HwBox title="Latch" mfr={specs.latchMfrName} model={specs.latchModel} onEdit={() => setActivePicker("latch")} />
              <HwBox title="Closer" mfr={closerHw.manufacturer} model={closerHw.model} onEdit={() => setActivePicker("closer")} />
              <HwBox title="Inside Release" mfr={releaseHw.manufacturer} model={releaseHw.model} onEdit={() => setActivePicker("insideRelease")} />
            </div>
          </div>
        ) : (
          <div className="px-4 py-3">
            <div className="grid grid-cols-1 gap-2">
              <HwBox title="Sliding Hardware" mfr="Kason" model={specs.doorPull} onEdit={() => setActivePicker("sliderHardware")} />
              <div className="grid grid-cols-2 gap-2">
                <HwBox title="Roller" mfr="Kason" model="HD Floor Roller" onEdit={() => setActivePicker("sliderRoller")} />
                <HwBox title="Strike / Tongue" mfr="Kason" model={specs.trackType} onEdit={() => setActivePicker("sliderStrike")} />
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── SECTION 4: Features & Options ── */}
      <SectionCard title="Features & Options">
        <SpecRow
          label="Window"
          value={specs.windowSize ? (specs.windowSize === "14x14" ? '14" × 14"' : '14" × 24"') : undefined}
          onEdit={() => setActivePicker("windowSize")}
        />
        {specs.windowSize && (
          <BoolRow label="Heated Window" value={specs.windowHeated} onToggle={() => toggleBoolean("windowHeated")} />
        )}
        {isFreezer && (
          <>
            {editingField === "heaterSize" ? <EditRow field="heaterSize" /> : (
              <SpecRow label="Heater Size" value={specs.heaterSize} onEdit={() => startEdit("heaterSize", specs.heaterSize)} />
            )}
            {editingField === "heaterCableLocation" ? <EditRow field="heaterCableLocation" /> : (
              <SpecRow label="Heater Location" value={specs.heaterCableLocation} onEdit={() => startEdit("heaterCableLocation", specs.heaterCableLocation)} />
            )}
          </>
        )}
        <BoolRow label="Weather Shield" value={specs.weatherShield} onToggle={() => toggleBoolean("weatherShield")} />
        <BoolRow label="Threshold Plate" value={specs.thresholdPlate} onToggle={() => toggleBoolean("thresholdPlate")} />
        <BoolRow label="Label" value={specs.label} onToggle={() => toggleBoolean("label")} />
        {isSlider && (
          <>
            {editingField === "doorPull" ? <EditRow field="doorPull" /> : (
              <SpecRow label="Door Pull" value={specs.doorPull} onEdit={() => startEdit("doorPull", specs.doorPull)} />
            )}
            {editingField === "trackType" ? <EditRow field="trackType" /> : (
              <SpecRow label="Track Type" value={specs.trackType} onEdit={() => startEdit("trackType", specs.trackType)} />
            )}
          </>
        )}
        {specs.cutouts && specs.cutouts.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-navy uppercase tracking-wide mb-2">Cutouts ({specs.cutouts.length})</p>
            {specs.cutouts.map((c, i) => (
              <div key={i} className="bg-white rounded-xl p-3 mb-2 last:mb-0 border border-border-custom/30">
                <p className="text-xs font-bold text-navy mb-1">
                  Cutout {i + 1}{c.side ? ` — ${c.side === "LEFT" ? "Left" : c.side === "RIGHT" ? "Right" : "Top"}` : ""}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-[10px] text-text-muted">Floor→Bottom</p><p className="text-sm font-semibold">{c.floorToBottom}&quot;</p></div>
                  <div><p className="text-[10px] text-text-muted">Floor→Top</p><p className="text-sm font-semibold">{c.floorToTop}&quot;</p></div>
                  <div><p className="text-[10px] text-text-muted">Width</p><p className="text-sm font-semibold">{c.frameWidth}&quot;</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
        {specs.additionalItems && specs.additionalItems.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-navy uppercase tracking-wide mb-2">Additional Items</p>
            <div className="flex flex-wrap gap-2">
              {specs.additionalItems.map((item, i) => (
                <span key={i} className="px-3 py-1 bg-brand-blue/10 text-brand-blue text-sm rounded-full font-medium">{item}</span>
              ))}
            </div>
          </div>
        )}
        {specs.specialNotes && (
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-navy uppercase tracking-wide mb-1">Special Notes</p>
            <p className="text-sm text-text-primary bg-status-yellow/10 p-2.5 rounded-xl border border-status-yellow/30">{specs.specialNotes}</p>
          </div>
        )}
      </SectionCard>

      {/* ── Notes ── */}
      <Card className="rounded-xl border-border-custom overflow-hidden">
        <div className="px-4 pt-3.5 pb-2">
          <h3 className="font-semibold text-navy text-base">Notes</h3>
        </div>
        <div className="px-4 pb-4">
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Optional notes for the shop..."
            className="w-full rounded-xl border border-border-custom p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>
      </Card>

      {/* ── Components ── */}
      <Card className="rounded-xl border-border-custom overflow-hidden">
        <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
          <h3 className="font-semibold text-navy text-base">Components ({components.length})</h3>
        </div>
        <div className="px-4 pb-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-brand-orange" />
              <p className="text-xs text-text-secondary">Add materials by voice or text</p>
            </div>
            <AIInput onParseComplete={onAddComponents} placeholder={`"4in IMP panels, gasket roll, 2 sets hinges..."`} />
          </div>
        </div>
        {components.length > 0 && (
          <div className="divide-y divide-border-custom/30">
            {components.map((comp, index) => {
              const hasEnough = comp.currentQty >= comp.qtyUsed
              return (
                <div key={`${comp.productId}-${index}`} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{comp.productName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full", hasEnough ? "bg-status-green" : "bg-status-red")} />
                      <span className={cn("text-xs", hasEnough ? "text-status-green" : "text-status-red")}>
                        {formatQuantity(comp.currentQty)} {comp.unitOfMeasure} in stock
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number" min={0} step="any" value={comp.qtyUsed}
                      onChange={(e) => onComponentChange(index, Number(e.target.value) || 0)}
                      className="w-16 rounded-xl border border-border-custom px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                    <span className="text-xs text-text-secondary w-8">{comp.unitOfMeasure}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveComponent(index)} className="h-8 w-8 text-status-red hover:text-status-red/80">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {components.length === 0 && (
          <p className="text-sm text-text-muted text-center px-4 pb-4">Add components from the catalog or skip for now</p>
        )}
      </Card>

      {/* ── Submit ── */}
      <div className="space-y-2">
        <Button onClick={onSubmit} disabled={isSubmitting} className="w-full h-16 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-lg rounded-xl shadow-[0_2px_8px_rgba(232,121,43,0.25)]">
          <Factory className="h-5 w-5 mr-2" />
          {isSubmitting ? "Creating..." : "Submit Door Sheet for Approval"}
        </Button>
        <Button variant="ghost" onClick={onBack} className="w-full text-text-muted">Back</Button>
      </div>

      {/* ── Option Picker (portal) ── */}
      {pickerConfig && (
        <OptionPicker
          key={activePicker}
          open={true}
          onOpenChange={(open) => { if (!open) setActivePicker(null) }}
          label={pickerConfig.label}
          wheels={pickerConfig.wheels}
          selectedValues={pickerConfig.values}
          onDone={(vals) => handlePickerDone(activePicker!, vals)}
          allowOther={pickerConfig.allowOther}
          getFilteredOptions={pickerConfig.getFiltered}
        />
      )}
    </div>
  )
}

// ─── Hardware Box (simplified, tappable) ─────────────────────────────────────

function HwBox({ title, mfr, model, offset, onEdit }: {
  title: string; mfr?: string; model?: string; offset?: string; onEdit: () => void
}) {
  return (
    <button type="button" onClick={onEdit} className="p-3 bg-surface-secondary rounded-xl text-left hover:bg-brand-blue/5 transition-colors w-full">
      <p className="text-[10px] font-bold uppercase text-navy tracking-wide mb-1.5">{title}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between min-h-[20px]">
          <span className="text-[10px] text-text-muted uppercase">Manufacturer</span>
          {mfr ? <span className="text-sm font-semibold text-navy">{mfr}</span> : <span className="text-xs text-text-muted">—</span>}
        </div>
        <div className="flex items-center justify-between min-h-[20px]">
          <span className="text-[10px] text-text-muted uppercase">Model</span>
          {model ? <span className="text-sm font-semibold text-navy">{model}</span> : <span className="text-xs text-text-muted">—</span>}
        </div>
        {offset && (
          <div className="flex items-center justify-between min-h-[20px]">
            <span className="text-[10px] text-text-muted uppercase">Offset</span>
            <span className="text-sm font-semibold text-navy">{offset}</span>
          </div>
        )}
      </div>
    </button>
  )
}
