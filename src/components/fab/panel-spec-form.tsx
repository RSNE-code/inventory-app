"use client"

import { useState } from "react"
import { TapeMeasureInput } from "@/components/doors/tape-measure-input"
import { OptionPicker } from "@/components/doors/option-picker"
import { Card } from "@/components/ui/card"
import { Ruler } from "lucide-react"
import {
  INSULATION_OPTIONS,
  INSULATION_THICKNESS_OPTIONS,
  PANEL_MATERIAL_OPTIONS,
  type PanelSpecs,
} from "@/lib/panel-specs"

interface PanelSpecFormProps {
  specs: PanelSpecs
  onChange: (specs: PanelSpecs) => void
  type: "WALL_PANEL" | "FLOOR_PANEL"
}

type ActivePicker =
  | null
  | "width"
  | "length"
  | "insulation"
  | "thickness"
  | "side1"
  | "side2"

export function PanelSpecForm({ specs, onChange, type }: PanelSpecFormProps) {
  const [activePicker, setActivePicker] = useState<ActivePicker>(null)
  const isFloor = type === "FLOOR_PANEL"

  function update(field: keyof PanelSpecs, value: string) {
    onChange({ ...specs, [field]: value })
  }

  // Format inches → feet'inches" for display
  function formatDim(inches: string): string {
    const val = parseFloat(inches)
    if (!val) return "Not set"
    const ft = Math.floor(val / 12)
    const rem = Math.round(val % 12)
    if (ft === 0) return `${rem}"`
    if (rem === 0) return `${ft}'`
    return `${ft}' ${rem}"`
  }

  return (
    <div className="space-y-4">
      {/* Dimensions */}
      <Card className="p-5 rounded-xl border-border-custom space-y-1">
        <h3 className="font-semibold text-navy text-sm mb-2">Dimensions</h3>

        <DimTrigger
          label="Width"
          value={formatDim(specs.width)}
          onOpen={() => setActivePicker("width")}
        />
        <TapeMeasureInput
          key="width"
          value={specs.width || ""}
          onChange={(v) => update("width", v)}
          label={isFloor ? "Width (Max 4')" : "Width (Max 20')"}
          mode="feet-inches"
          min={1}
          max={isFloor ? 4 : 20}
          open={activePicker === "width"}
          onOpenChange={(open) => { if (!open) setActivePicker(null) }}
        />

        <DimTrigger
          label="Length"
          value={formatDim(specs.length)}
          onOpen={() => setActivePicker("length")}
        />
        <TapeMeasureInput
          key="length"
          value={specs.length || ""}
          onChange={(v) => update("length", v)}
          label={isFloor ? "Length (Max 4')" : "Length (Max 20')"}
          mode="feet-inches"
          min={1}
          max={isFloor ? 4 : 20}
          open={activePicker === "length"}
          onOpenChange={(open) => { if (!open) setActivePicker(null) }}
        />
      </Card>

      {/* Insulation */}
      <Card className="p-5 rounded-xl border-border-custom space-y-1">
        <h3 className="font-semibold text-navy text-sm mb-2">Insulation</h3>

        <SpecTrigger
          label="Insulation Type"
          value={specs.insulation || "Not set"}
          onOpen={() => setActivePicker("insulation")}
        />
        <OptionPicker
          open={activePicker === "insulation"}
          onOpenChange={(open) => { if (!open) setActivePicker(null) }}
          label="Insulation Type"
          wheels={[{
            label: "Type",
            options: INSULATION_OPTIONS.map((o) => ({ label: o, value: o })),
          }]}
          selectedValues={[specs.insulation || INSULATION_OPTIONS[0]]}
          onDone={([val]) => {
            update("insulation", val)
            setActivePicker(null)
          }}
        />

        <SpecTrigger
          label="Insulation Thickness"
          value={specs.insulationThickness ? `${specs.insulationThickness}"` : "Not set"}
          onOpen={() => setActivePicker("thickness")}
        />
        <OptionPicker
          open={activePicker === "thickness"}
          onOpenChange={(open) => { if (!open) setActivePicker(null) }}
          label="Insulation Thickness"
          wheels={[{
            label: "Inches",
            options: INSULATION_THICKNESS_OPTIONS.map((o) => ({ label: `${o}"`, value: o })),
          }]}
          selectedValues={[specs.insulationThickness || ""]}
          onDone={([val]) => {
            update("insulationThickness", val)
            setActivePicker(null)
          }}
        />
      </Card>

      {/* Materials */}
      <Card className="p-5 rounded-xl border-border-custom space-y-1">
        <h3 className="font-semibold text-navy text-sm mb-2">Materials</h3>

        <SpecTrigger
          label="Side 1 Material"
          value={specs.side1Material || (isFloor ? "None" : "Not set")}
          onOpen={() => setActivePicker("side1")}
        />
        <OptionPicker
          open={activePicker === "side1"}
          onOpenChange={(open) => { if (!open) setActivePicker(null) }}
          label="Side 1 Material"
          wheels={[{
            label: "Material",
            options: PANEL_MATERIAL_OPTIONS.map((o) => ({ label: o, value: o })),
          }]}
          selectedValues={[specs.side1Material || (isFloor ? "None" : "FRP")]}
          onDone={([val]) => {
            update("side1Material", val)
            setActivePicker(null)
          }}
          allowOther
        />

        <SpecTrigger
          label="Side 2 Material"
          value={specs.side2Material || (isFloor ? "None" : "Not set")}
          onOpen={() => setActivePicker("side2")}
        />
        <OptionPicker
          open={activePicker === "side2"}
          onOpenChange={(open) => { if (!open) setActivePicker(null) }}
          label="Side 2 Material"
          wheels={[{
            label: "Material",
            options: PANEL_MATERIAL_OPTIONS.map((o) => ({ label: o, value: o })),
          }]}
          selectedValues={[specs.side2Material || (isFloor ? "None" : "FRP")]}
          onDone={([val]) => {
            update("side2Material", val)
            setActivePicker(null)
          }}
          allowOther
        />
      </Card>
    </div>
  )
}

// ── Dimension trigger — tap to open tape measure ──

function DimTrigger({ label, value, onOpen }: { label: string; value: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center justify-between py-2.5 min-h-[44px] border-b border-border-custom/40 last:border-0 active:bg-surface-secondary/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Ruler className="h-4 w-4 text-brand-orange" />
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <span className="text-sm font-semibold text-navy">{value}</span>
    </button>
  )
}

// ── Shared trigger button for option pickers ──

function SpecTrigger({ label, value, onOpen }: { label: string; value: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center justify-between py-2.5 min-h-[44px] border-b border-border-custom/40 last:border-0 active:bg-surface-secondary/50 transition-colors"
    >
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-navy">{value}</span>
    </button>
  )
}
