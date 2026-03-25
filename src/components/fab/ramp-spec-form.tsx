"use client"

import { useState } from "react"
import { TapeMeasureInput } from "@/components/doors/tape-measure-input"
import { OptionPicker } from "@/components/doors/option-picker"
import { Card } from "@/components/ui/card"
import { Ruler } from "lucide-react"
import {
  INSULATION_OPTIONS,
  DIAMOND_PLATE_OPTIONS,
  type RampSpecs,
} from "@/lib/panel-specs"

interface RampSpecFormProps {
  specs: RampSpecs
  onChange: (specs: RampSpecs) => void
}

type ActivePicker =
  | null
  | "width"
  | "length"
  | "height"
  | "bottomLip"
  | "topLip"
  | "insulation"
  | "diamondPlate"

const RAMP_DIMS: { key: keyof RampSpecs; label: string; max: number }[] = [
  { key: "width", label: "Width", max: 120 },
  { key: "length", label: "Length", max: 240 },
  { key: "height", label: "Height (highest point)", max: 48 },
  { key: "bottomLip", label: "Bottom Lip", max: 12 },
  { key: "topLip", label: "Top Lip", max: 12 },
]

export function RampSpecForm({ specs, onChange }: RampSpecFormProps) {
  const [activePicker, setActivePicker] = useState<ActivePicker>(null)

  function update(field: keyof RampSpecs, value: string) {
    onChange({ ...specs, [field]: value })
  }

  return (
    <div className="space-y-4">
      {/* Dimensions */}
      <Card className="p-5 rounded-xl border-border-custom space-y-1">
        <h3 className="font-semibold text-navy text-sm mb-2">Dimensions</h3>

        {RAMP_DIMS.map((dim) => (
          <div key={dim.key}>
            <DimTrigger
              label={dim.label}
              value={specs[dim.key] ? `${specs[dim.key]}"` : "Not set"}
              onOpen={() => setActivePicker(dim.key as ActivePicker)}
            />
            <TapeMeasureInput
              key={dim.key}
              value={specs[dim.key] || ""}
              onChange={(v) => {
                const whole = parseInt(v.split("-")[0]) || 0
                update(dim.key, String(whole))
              }}
              label={`${dim.label} (inches)`}
              min={1}
              max={dim.max}
              open={activePicker === dim.key}
              onOpenChange={(open) => { if (!open) setActivePicker(null) }}
            />
          </div>
        ))}
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
      </Card>

      {/* Finish */}
      <Card className="p-5 rounded-xl border-border-custom space-y-1">
        <h3 className="font-semibold text-navy text-sm mb-2">Finish</h3>

        <SpecTrigger
          label="Diamond Plate Thickness"
          value={specs.diamondPlateThickness ? `${specs.diamondPlateThickness}"` : "Not set"}
          onOpen={() => setActivePicker("diamondPlate")}
        />
        <OptionPicker
          open={activePicker === "diamondPlate"}
          onOpenChange={(open) => { if (!open) setActivePicker(null) }}
          label="Diamond Plate Thickness"
          wheels={[{
            label: "Thickness",
            options: DIAMOND_PLATE_OPTIONS.map((o) => ({ label: `${o}"`, value: o })),
          }]}
          selectedValues={[specs.diamondPlateThickness || DIAMOND_PLATE_OPTIONS[0]]}
          onDone={([val]) => {
            update("diamondPlateThickness", val)
            setActivePicker(null)
          }}
        />
      </Card>
    </div>
  )
}

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
