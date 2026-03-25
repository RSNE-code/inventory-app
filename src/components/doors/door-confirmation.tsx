"use client"

import { useState } from "react"
import type { DoorSpecs } from "@/lib/door-specs"
import { FIELD_METADATA, calculateHeaterCable } from "@/lib/door-specs"
import { formatDoorFieldValue, splitHardwareValue } from "@/lib/door-field-labels"
import { SectionCard, SpecRow, BoolRow } from "./spec-primitives"
import { TapeMeasureInput } from "./tape-measure-input"
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
  notes,
  onNotesChange,
  onSubmit,
  isSubmitting,
  onBack,
}: DoorConfirmationProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [measureField, setMeasureField] = useState<string | null>(null)

  // ── Edit helpers ──

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

    // Auto-recalculate heater cable when dimensions change
    if (
      ["widthInClear", "heightInClear", "highSill"].includes(editingField) &&
      specs.temperatureType === "FREEZER"
    ) {
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
    if (field === "wiper") {
      onSpecChange("highSill", current)
    }
  }

  // ── Inline edit row (shown when a field is being edited) ──

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

  // Hardware splitting via shared utility
  const closerHw = splitHardwareValue(specs.closerModel)
  const releaseHw = splitHardwareValue(specs.insideRelease)

  return (
    <div className="space-y-3 overscroll-fix">
      {/* Job badge */}
      {jobName && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-navy/8 rounded-xl">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Job</span>
          <span className="text-sm font-bold text-navy">{jobName}</span>
        </div>
      )}

      {/* ── SECTION 1: Dimensions ── */}
      <SectionCard title="Dimensions">
        <SpecRow label="Width (in clear)" value={specs.widthInClear} suffix='"' onEdit={() => setMeasureField("widthInClear")} />
        <SpecRow label="Height (in clear)" value={specs.heightInClear} suffix='"' onEdit={() => setMeasureField("heightInClear")} />
        <SpecRow label="Jamb Depth" value={specs.jambDepth} suffix='"' onEdit={() => setMeasureField("jambDepth")} />
        <SpecRow label="Wall Thickness" value={specs.wallThickness} suffix='"' onEdit={() => setMeasureField("wallThickness")} />
      </SectionCard>

      {/* Tape measure picker for dimensions */}
      {measureField && <TapeMeasureInput
        key={measureField}
        value={String(specs[measureField as keyof DoorSpecs] || "")}
        onChange={(v) => {
          if (measureField) {
            onSpecChange(measureField, v || undefined)
            // Auto-recalculate heater cable when dimensions change
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

      {/* ── SECTION 2: Configuration ── */}
      <SectionCard title="Configuration">
        <SpecRow label="Temperature" value={formatDoorFieldValue("temperatureType", specs.temperatureType)} />
        <SpecRow label="Opening Type" value={formatDoorFieldValue("openingType", specs.openingType)} />
        {!isSlider && (
          <SpecRow label="Frame Type" value={formatDoorFieldValue("frameType", specs.frameType)} />
        )}
        {isSlider ? (
          <SpecRow label="Slide Side" value={formatDoorFieldValue("slideSide", specs.slideSide)} />
        ) : (
          <SpecRow label="Hinge Side" value={formatDoorFieldValue("hingeSide", specs.hingeSide)} />
        )}
        {editingField === "finish" ? <EditRow field="finish" /> : (
          <SpecRow label="Finish" value={specs.finish} onEdit={() => startEdit("finish", specs.finish)} />
        )}
        <SpecRow label="Insulation Type" value={specs.insulationType} />
        <SpecRow label="Gasket Type" value={formatDoorFieldValue("gasketType", specs.gasketType)} />
        <BoolRow label="High Sill" value={specs.highSill} onToggle={() => toggleBoolean("highSill")} />
        <BoolRow label="Wiper" value={specs.wiper} onToggle={() => toggleBoolean("wiper")} />
        <BoolRow label="Exterior Door" value={specs.isExterior} onToggle={() => toggleBoolean("isExterior")} />
      </SectionCard>

      {/* ── SECTION 3: Hardware (4-box grid) ── */}
      <SectionCard title="Hardware">
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            {/* Hinges */}
            <HardwareBox
              title="Hinges"
              manufacturer={specs.hingeMfrName}
              model={specs.hingeModel}
              offset={specs.hingeOffset}
              onEdit={() => startEdit("hingeModel", specs.hingeModel)}
              isEditing={editingField === "hingeModel"}
              editValue={editValue}
              onEditChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
            {/* Latch */}
            <HardwareBox
              title="Latch"
              manufacturer={specs.latchMfrName}
              model={specs.latchModel}
              onEdit={() => startEdit("latchModel", specs.latchModel)}
              isEditing={editingField === "latchModel"}
              editValue={editValue}
              onEditChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
            {/* Closer */}
            <HardwareBox
              title="Closer"
              manufacturer={closerHw.manufacturer}
              model={closerHw.model}
              onEdit={() => startEdit("closerModel", specs.closerModel)}
              isEditing={editingField === "closerModel"}
              editValue={editValue}
              onEditChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
            {/* Inside Release */}
            <HardwareBox
              title="Inside Release"
              manufacturer={releaseHw.manufacturer}
              model={releaseHw.model}
              onEdit={() => startEdit("insideRelease", specs.insideRelease)}
              isEditing={editingField === "insideRelease"}
              editValue={editValue}
              onEditChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── SECTION 4: Features & Options ── */}
      <SectionCard title="Features & Options">
        {/* Window */}
        <SpecRow
          label="Window"
          value={specs.windowSize ? (specs.windowSize === "14x14" ? '14" × 14"' : '14" × 24"') : undefined}
        />
        {specs.windowSize && (
          <BoolRow label="Heated Window" value={specs.windowHeated} onToggle={() => toggleBoolean("windowHeated")} />
        )}
        {/* Heater (freezer) */}
        {isFreezer && (
          <>
            <SpecRow label="Heater Size" value={specs.heaterSize} />
            <SpecRow label="Heater Location" value={specs.heaterCableLocation} />
          </>
        )}
        {/* Options */}
        <BoolRow label="Weather Shield" value={specs.weatherShield} onToggle={() => toggleBoolean("weatherShield")} />
        <BoolRow label="Threshold Plate" value={specs.thresholdPlate} onToggle={() => toggleBoolean("thresholdPlate")} />
        <BoolRow label="Label" value={specs.label} onToggle={() => toggleBoolean("label")} />
        {/* Sliding door extras */}
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
        {/* Cutouts */}
        {specs.cutouts && specs.cutouts.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-navy uppercase tracking-wide mb-2">
              Cutouts ({specs.cutouts.length})
            </p>
            {specs.cutouts.map((c, i) => (
              <div key={i} className="bg-white rounded-xl p-3 mb-2 last:mb-0 border border-border-custom/30">
                <p className="text-xs font-bold text-navy mb-1">
                  Cutout {i + 1}{c.side ? ` — ${c.side === "LEFT" ? "Left" : c.side === "RIGHT" ? "Right" : "Top"}` : ""}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-text-muted">Floor→Bottom</p>
                    <p className="text-sm font-semibold">{c.floorToBottom}&quot;</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted">Floor→Top</p>
                    <p className="text-sm font-semibold">{c.floorToTop}&quot;</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted">Width</p>
                    <p className="text-sm font-semibold">{c.frameWidth}&quot;</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Additional Items */}
        {specs.additionalItems && specs.additionalItems.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-navy uppercase tracking-wide mb-2">Additional Items</p>
            <div className="flex flex-wrap gap-2">
              {specs.additionalItems.map((item, i) => (
                <span key={i} className="px-3 py-1 bg-brand-blue/10 text-brand-blue text-sm rounded-full font-medium">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* Special Notes */}
        {specs.specialNotes && (
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-navy uppercase tracking-wide mb-1">Special Notes</p>
            <p className="text-sm text-text-primary bg-status-yellow/10 p-2.5 rounded-xl border border-status-yellow/30">
              {specs.specialNotes}
            </p>
          </div>
        )}
      </SectionCard>

      {/* ── SECTION 5: Components & Notes ── */}
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

      <Card className="rounded-xl border-border-custom overflow-hidden">
        <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
          <h3 className="font-semibold text-navy text-base">
            Components ({components.length})
          </h3>
        </div>
        <div className="px-4 pb-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-brand-orange" />
              <p className="text-xs text-text-secondary">Add materials by voice or text</p>
            </div>
            <AIInput
              onParseComplete={onAddComponents}
              placeholder={`"4in IMP panels, gasket roll, 2 sets hinges..."`}
            />
          </div>
        </div>

        {components.length > 0 && (
          <div className="divide-y divide-border-custom/30">
            {components.map((comp, index) => {
              const hasEnough = comp.currentQty >= comp.qtyUsed
              return (
                <div
                  key={`${comp.productId}-${index}`}
                  className="flex items-center justify-between px-4 py-2.5"
                >
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
                      type="number"
                      min={0}
                      step="any"
                      value={comp.qtyUsed}
                      onChange={(e) => onComponentChange(index, Number(e.target.value) || 0)}
                      className="w-16 rounded-xl border border-border-custom px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                    <span className="text-xs text-text-secondary w-8">{comp.unitOfMeasure}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveComponent(index)}
                      className="h-8 w-8 text-status-red hover:text-status-red/80"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {components.length === 0 && (
          <p className="text-sm text-text-muted text-center px-4 pb-4">
            Add components from the catalog or skip for now
          </p>
        )}
      </Card>

      {/* ── Submit ── */}
      <div className="space-y-2">
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full h-16 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-lg rounded-xl shadow-[0_2px_8px_rgba(232,121,43,0.25)]"
        >
          <Factory className="h-5 w-5 mr-2" />
          {isSubmitting ? "Creating..." : "Submit Door Sheet for Approval"}
        </Button>
        <Button variant="ghost" onClick={onBack} className="w-full text-text-muted">
          Back
        </Button>
      </div>
    </div>
  )
}

// ─── Hardware Box (self-contained, editable) ─────────────────────────────────

function HardwareBox({
  title,
  manufacturer,
  model,
  offset,
  onEdit,
  isEditing,
  editValue,
  onEditChange,
  onSave,
  onCancel,
}: {
  title: string
  manufacturer?: string
  model?: string
  offset?: string
  onEdit: () => void
  isEditing: boolean
  editValue: string
  onEditChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="p-3 bg-surface-secondary rounded-xl">
      <p className="text-[10px] font-bold uppercase text-navy tracking-wide mb-1.5">{title}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between min-h-[20px]">
          <span className="text-[10px] text-text-muted uppercase">Manufacturer</span>
          {manufacturer ? (
            <span className="text-sm font-semibold text-navy">{manufacturer}</span>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </div>
        <div className="flex items-center justify-between min-h-[20px]">
          <span className="text-[10px] text-text-muted uppercase">Model</span>
          {model ? (
            <span className="text-sm font-semibold text-navy">{model}</span>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </div>
        {offset && (
          <div className="flex items-center justify-between min-h-[20px]">
            <span className="text-[10px] text-text-muted uppercase">Offset</span>
            <span className="text-sm font-semibold text-navy">{offset}</span>
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="mt-2 flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="h-7 text-xs flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave()
              if (e.key === "Escape") onCancel()
            }}
          />
          <Button size="sm" onClick={onSave} className="h-7 w-7 p-0 bg-brand-blue text-white">
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 w-7 p-0">
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="mt-1.5 hover:opacity-70 transition-opacity"
          aria-label={`Edit ${title}`}
        >
          <svg className="h-3 w-3 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </button>
      )}
    </div>
  )
}
