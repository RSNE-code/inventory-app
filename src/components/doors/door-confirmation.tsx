"use client"

import { useState, useCallback } from "react"
import type { DoorSpecs, DoorCategory, FrameType, GasketType, Side, Cutout } from "@/lib/door-specs"
import { FIELD_METADATA, calculateHeaterCable } from "@/lib/door-specs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AIInput } from "@/components/ai/ai-input"
import { cn, formatQuantity } from "@/lib/utils"
import { toast } from "sonner"
import {
  Pencil,
  Check,
  X,
  Mic,
  Trash2,
  Factory,
  Plus,
} from "lucide-react"
import type { ParseResult, ReceivingParseResult, CatalogMatch } from "@/lib/ai/types"

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

// Spec sections for organized display
const SPEC_SECTIONS = [
  {
    title: "Dimensions",
    fields: ["widthInClear", "heightInClear", "jambDepth", "wallThickness"],
  },
  {
    title: "Configuration",
    fields: [
      "doorCategory", "temperatureType", "openingType",
      "hingeSide", "slideSide", "frameType",
      "frameCustom", "frameLHS", "frameRHS", "frameTop",
    ],
  },
  {
    title: "Insulation",
    fields: ["insulationType", "panelThickness", "panelInsulated", "insulation"],
  },
  {
    title: "Finish",
    fields: ["finish", "skinMaterial"],
  },
  {
    title: "Window",
    fields: ["windowSize", "windowHeated"],
  },
  {
    title: "Hardware",
    fields: [], // Rendered as custom 4-box grid below, not individual fields
  },
  {
    title: "Heater",
    fields: ["heaterSize", "heaterCableLocation"],
  },
  {
    title: "Gasket & Sill",
    fields: ["gasketType", "highSill", "sillHeight", "wiper"],
  },
  {
    title: "Options",
    fields: ["weatherShield", "thresholdPlate", "isExterior", "label"],
  },
  {
    title: "Sliding Door",
    fields: ["doorPull", "trackType"],
  },
]

export function DoorConfirmation({
  specs,
  onSpecChange,
  components,
  onComponentChange,
  onRemoveComponent,
  onAddComponents,
  jobName,
  onJobNameChange,
  notes,
  onNotesChange,
  onSubmit,
  isSubmitting,
  onBack,
}: DoorConfirmationProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

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

    // High sill / wiper mutual exclusion
    if (field === "highSill") {
      onSpecChange("wiper", current) // opposite
      if (!current && specs.temperatureType === "FREEZER") {
        // Turning high sill ON → recalculate heater
        const updated = { ...specs, highSill: true }
        const cable = calculateHeaterCable(updated)
        if (cable) onSpecChange("heaterSize", cable)
      }
    }
    if (field === "wiper") {
      onSpecChange("highSill", current)
    }
  }

  function getDisplayLabel(field: string): string {
    const meta = FIELD_METADATA[field]
    if (meta?.label) return meta.label
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim()
  }

  function formatValue(field: string, value: unknown): string {
    if (typeof value === "boolean") return value ? "Yes" : "No"
    if (Array.isArray(value)) return value.join(", ")
    return String(value)
  }

  // Filter sections to only show fields that have values or are relevant
  const isSlider = specs.doorCategory === "SLIDING"

  return (
    <div className="space-y-4 overscroll-fix">
      {/* Job badge — read-only display of selected job */}
      {jobName && (
        <div className="flex items-center gap-2 px-3 py-2 bg-navy/8 rounded-xl">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Job</span>
          <span className="text-sm font-bold text-navy">{jobName}</span>
        </div>
      )}

      {/* Spec Sections */}
      {SPEC_SECTIONS.map((section) => {
        // Skip sliding section for hinged doors and vice versa
        if (section.title === "Sliding Door" && !isSlider) return null
        if (section.title === "Heater" && specs.temperatureType !== "FREEZER") return null

        const fieldsWithValues = section.fields.filter((f) => {
          const val = specs[f as keyof DoorSpecs]
          return val !== undefined && val !== null && val !== ""
        })

        if (fieldsWithValues.length === 0) return null

        return (
          <Card key={section.title} className="p-4 rounded-xl border-border-custom">
            <h3 className="font-semibold text-navy text-base mb-3">{section.title}</h3>
            <div className="space-y-1">
              {fieldsWithValues.map((field) => {
                const value = specs[field as keyof DoorSpecs]
                const isBool = typeof value === "boolean"
                const label = getDisplayLabel(field)

                if (editingField === field) {
                  return (
                    <div key={field} className="flex items-center gap-2 py-1.5">
                      <span className="text-sm text-text-secondary w-32 shrink-0">{label}</span>
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit()
                          if (e.key === "Escape") cancelEdit()
                        }}
                      />
                      <Button size="sm" onClick={saveEdit} className="h-8 px-2 bg-brand-blue text-white">
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 px-2">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )
                }

                if (isBool) {
                  return (
                    <button
                      key={field}
                      onClick={() => toggleBoolean(field)}
                      className="flex items-center justify-between w-full py-1.5 px-1 -mx-1 rounded hover:bg-surface-secondary transition-colors"
                    >
                      <span className="text-sm text-text-secondary w-32 shrink-0">{label}</span>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className={cn("text-base font-medium", value ? "text-status-green" : "text-text-muted")}>
                          {value ? "Yes" : "No"}
                        </span>
                        <div
                          className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center",
                            value ? "border-green-500 bg-green-500" : "border-border-custom"
                          )}
                        >
                          {value && (
                            <Check className="h-2.5 w-2.5 text-white" />
                          )}
                        </div>
                      </div>
                    </button>
                  )
                }

                return (
                  <button
                    key={field}
                    onClick={() => startEdit(field, value)}
                    className="flex items-center justify-between w-full py-2 px-1 -mx-1 rounded hover:bg-surface-secondary transition-colors text-left"
                  >
                    <span className="text-sm text-text-secondary w-32 shrink-0">{label}</span>
                    <span className="text-base font-medium text-navy flex-1">{formatValue(field, value)}</span>
                    <Pencil className="h-3.5 w-3.5 text-text-muted/60 shrink-0 ml-2" />
                  </button>
                )
              })}
            </div>
          </Card>
        )
      })}

      {/* Hardware — 2×2 grid: Item + Manufacturer in each box */}
      {(specs.hingeMfrName || specs.hingeModel || specs.latchMfrName || specs.latchModel || specs.closerModel || specs.insideRelease) && (
        <Card className="p-4 rounded-xl border-border-custom">
          <h3 className="font-semibold text-navy text-base mb-3">Hardware</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                title: "Hinges",
                rows: [
                  { label: "Mfr", field: "hingeMfrName", value: specs.hingeMfrName },
                  { label: "Model", field: "hingeModel", value: specs.hingeModel },
                  ...(specs.hingeOffset ? [{ label: "Offset", field: "hingeOffset", value: specs.hingeOffset }] : []),
                ],
                show: !!(specs.hingeMfrName || specs.hingeModel),
              },
              {
                title: "Latch",
                rows: [
                  { label: "Mfr", field: "latchMfrName", value: specs.latchMfrName },
                  { label: "Model", field: "latchModel", value: specs.latchModel },
                ],
                show: !!(specs.latchMfrName || specs.latchModel),
              },
              {
                title: "Closer",
                rows: [
                  { label: "Model", field: "closerModel", value: specs.closerModel },
                ],
                show: !!specs.closerModel,
              },
              {
                title: "Inside Release",
                rows: [
                  { label: "Model", field: "insideRelease", value: specs.insideRelease },
                ],
                show: !!specs.insideRelease,
              },
            ]
              .filter((box) => box.show)
              .map((box) => {
                // Check if any field in this box is being edited
                const editingRow = box.rows.find((r) => r.field === editingField)

                return (
                  <div key={box.title} className="p-3 bg-surface-secondary rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-text-muted tracking-wide block mb-1.5">
                      {box.title}
                    </span>
                    <div className="space-y-1">
                      {box.rows.map((row) => {
                        if (!row.value && editingField !== row.field) return null

                        if (editingField === row.field) {
                          return (
                            <div key={row.field} className="space-y-1">
                              <span className="text-[10px] text-text-muted uppercase">{row.label}</span>
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-7 text-xs flex-1"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit()
                                    if (e.key === "Escape") cancelEdit()
                                  }}
                                />
                                <Button size="sm" onClick={saveEdit} className="h-7 w-7 p-0 bg-brand-blue text-white">
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 w-7 p-0">
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )
                        }

                        return (
                          <button
                            key={row.field}
                            onClick={() => startEdit(row.field, row.value)}
                            className="flex items-center justify-between w-full hover:opacity-70 transition-opacity"
                          >
                            <span className="text-[10px] text-text-muted uppercase">{row.label}</span>
                            <span className="text-sm font-semibold text-navy">{String(row.value)}</span>
                          </button>
                        )
                      })}
                    </div>
                    {!editingRow && (
                      <Pencil className="h-3 w-3 text-text-muted/40 mt-1.5" />
                    )}
                  </div>
                )
              })}
          </div>
        </Card>
      )}

      {/* Cutouts section */}
      {specs.cutouts && specs.cutouts.length > 0 && (
        <Card className="p-4 rounded-xl border-border-custom">
          <h3 className="font-semibold text-navy text-sm mb-2">Cutouts ({specs.cutouts.length})</h3>
          {specs.cutouts.map((c, i) => (
            <div key={i} className="text-sm py-1 border-b border-border-custom/40 last:border-0">
              <span className="text-text-muted text-xs">Cutout {i + 1}{c.side ? ` (${c.side === "LEFT" ? "Left" : c.side === "RIGHT" ? "Right" : "Top"})` : ""}:</span>{" "}
              <span className="font-medium">
                {c.floorToBottom} → {c.floorToTop}, Width: {c.frameWidth}
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* Additional Items */}
      {specs.additionalItems && specs.additionalItems.length > 0 && (
        <Card className="p-4 rounded-xl border-border-custom">
          <h3 className="font-semibold text-navy text-sm mb-2">Additional Items</h3>
          <div className="flex flex-wrap gap-2">
            {specs.additionalItems.map((item, i) => (
              <span key={i} className="px-3 py-1 bg-brand-blue/10 text-brand-blue text-sm rounded-full font-medium">
                {item}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Special Notes */}
      {specs.specialNotes && (
        <Card className="p-4 rounded-xl border-border-custom">
          <h3 className="font-semibold text-navy text-sm mb-1">Special Notes</h3>
          <p className="text-sm text-text-primary">{specs.specialNotes}</p>
        </Card>
      )}

      {/* Notes */}
      <Card className="p-4 rounded-xl border-border-custom space-y-3">
        <h3 className="font-semibold text-navy text-base">Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Optional notes for the shop..."
          className="w-full rounded-lg border border-border-custom p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
      </Card>

      {/* Components */}
      <Card className="p-4 rounded-xl border-border-custom space-y-3">
        <h3 className="font-semibold text-navy text-base">
          Components ({components.length})
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-[#E8792B]" />
            <p className="text-xs text-text-secondary">Add materials by voice or text</p>
          </div>
          <AIInput
            onParseComplete={onAddComponents}
            placeholder={`"4in IMP panels, gasket roll, 2 sets hinges..."`}
          />
        </div>

        {components.length > 0 && (
          <div className="space-y-1">
            {components.map((comp, index) => {
              const hasEnough = comp.currentQty >= comp.qtyUsed
              return (
                <div
                  key={`${comp.productId}-${index}`}
                  className="flex items-center justify-between py-2 border-b border-border-custom/40 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{comp.productName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full", hasEnough ? "bg-green-500" : "bg-red-500")} />
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
                      className="w-16 rounded-lg border border-border-custom px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-text-secondary w-8">{comp.unitOfMeasure}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveComponent(index)}
                      className="h-7 w-7 text-red-400 hover:text-red-600"
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
          <p className="text-sm text-text-muted text-center py-4">
            Add components from the catalog or skip for now
          </p>
        )}
      </Card>

      {/* Submit */}
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
