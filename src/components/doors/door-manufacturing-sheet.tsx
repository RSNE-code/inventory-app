"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatDoorSize } from "@/lib/door-specs"
import type { DoorSpecs } from "@/lib/door-specs"
import { splitHardwareValue } from "@/lib/door-field-labels"

interface DoorManufacturingSheetProps {
  specs: Partial<DoorSpecs>
  createdAt: string
  onToggleView?: () => void
}

function MfgCheckbox({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded border-2 text-xs font-bold",
          checked
            ? "border-navy bg-navy text-white"
            : "border-border-custom bg-white"
        )}
      >
        {checked && "\u2713"}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </span>
  )
}

function MfgField({
  label,
  value,
  large,
}: {
  label: string
  value?: string | null
  large?: boolean
}) {
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-border-custom">
      <span className="text-sm font-bold uppercase shrink-0 w-28">{label}</span>
      <span
        className={cn(
          "flex-1 tabular-nums",
          large ? "text-lg font-bold" : "text-sm font-medium"
        )}
      >
        {value || "\u00A0"}
      </span>
    </div>
  )
}

/** Hardware box for manufacturing sheet — compact with Manufacturer + Model */
function MfgHardwareBox({
  title,
  manufacturer,
  model,
  offset,
}: {
  title: string
  manufacturer?: string
  model?: string
  offset?: string
}) {
  return (
    <div className="bg-surface-secondary rounded-xl p-2.5">
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{title}</p>
      <div className="space-y-0.5">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] text-text-muted uppercase">Mfr</span>
          {manufacturer ? (
            <span className="text-sm font-semibold text-navy">{manufacturer}</span>
          ) : (
            <span className="text-[10px] text-text-muted italic">—</span>
          )}
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] text-text-muted uppercase">Model</span>
          {model ? (
            <span className="text-sm font-semibold text-navy">{model}</span>
          ) : (
            <span className="text-[10px] text-text-muted italic">—</span>
          )}
        </div>
      </div>
      {offset && (
        <p className="text-xs text-text-secondary mt-0.5">
          Offset: {offset}
        </p>
      )}
    </div>
  )
}

export function DoorManufacturingSheet({
  specs,
  createdAt,
  onToggleView,
}: DoorManufacturingSheetProps) {
  const isFreezer = specs.temperatureType === "FREEZER"
  const isHinged = specs.openingType === "HINGE"

  return (
    <Card className="rounded-xl border-2 border-navy overflow-hidden bg-white print:shadow-none print:rounded-none">
      {/* Header */}
      <div className="text-center py-3 border-b-2 border-navy">
        <p className="text-sm font-semibold tracking-wide">
          Refrigerated Structures of New England
        </p>
        <h3 className="text-lg font-extrabold uppercase tracking-wide mt-0.5">
          Door Manufacturing Sheet
        </h3>
      </div>

      <div className="px-4 py-3 space-y-1">
        {/* Date */}
        <MfgField
          label="DATE"
          value={new Date(createdAt).toLocaleDateString()}
        />

        {/* Job # */}
        <MfgField label="JWO or JOB #" value={specs.jobNumber} />

        {/* Serial # */}
        <div className="flex items-center gap-6 py-2 border-b border-border-custom">
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-bold uppercase w-28 shrink-0">SERIAL #</span>
            <span className="text-sm font-medium">
              {specs.serialNumber || "\u00A0"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <MfgCheckbox label="LABEL" checked={specs.label !== false} />
            <MfgCheckbox label="NO LABEL" checked={specs.label === false} />
          </div>
        </div>

        {/* Job Name */}
        <MfgField
          label="JOB NAME"
          value={
            [specs.jobName, specs.jobSiteName].filter(Boolean).join(" — ") ||
            undefined
          }
        />

        {/* Cooler / Freezer */}
        <div className="flex items-center gap-8 py-3 border-b border-border-custom">
          <MfgCheckbox label="COOLER DOOR" checked={!isFreezer} />
          <MfgCheckbox label="FREEZER DOOR" checked={isFreezer} />
        </div>

        {/* Door Size */}
        <div className="flex items-baseline gap-3 py-3 border-b border-border-custom">
          <span className="text-sm font-bold uppercase w-28 shrink-0">DOOR SIZE</span>
          <span className="text-xl font-extrabold tracking-wide tabular-nums">
            {formatDoorSize(specs) || "\u00A0"}
          </span>
        </div>

        {/* Frame Type */}
        <div className="flex items-center gap-6 py-3 border-b border-border-custom">
          <MfgCheckbox
            label="FULL FRAME"
            checked={specs.frameType === "FULL_FRAME"}
          />
          <MfgCheckbox
            label="FACE FRAME"
            checked={specs.frameType === "FACE_FRAME"}
          />
          <MfgCheckbox
            label="BALLY TYPE"
            checked={specs.frameType === "BALLY_TYPE"}
          />
        </div>

        {/* High Sill / Wiper */}
        <div className="flex items-center gap-8 py-3 border-b border-border-custom">
          <MfgCheckbox label="HIGH SILL" checked={specs.highSill} />
          <MfgCheckbox label="WIPER" checked={specs.wiper} />
        </div>

        {/* Jamb Depth / Heater */}
        <div className="flex items-center gap-6 py-2 border-b border-border-custom">
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-bold uppercase w-28 shrink-0">JAMB DEPTH</span>
            <span className="text-base font-semibold tabular-nums">
              {specs.jambDepth ? (specs.jambDepth.includes('"') ? specs.jambDepth : `${specs.jambDepth}"`) : "\u00A0"}
            </span>
          </div>
          {isFreezer && (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold uppercase">HEATER SIZE</span>
              <span className="text-base font-semibold tabular-nums">
                {specs.heaterSize || "\u00A0"}
              </span>
            </div>
          )}
        </div>

        {/* Insulation */}
        <div className="flex items-baseline gap-3 py-2 border-b border-border-custom">
          <span className="text-sm font-bold uppercase w-28 shrink-0">INSULATION</span>
          <span className="text-sm font-semibold">
            {specs.insulationType || specs.insulation || "\u00A0"}
            {specs.panelThickness ? ` ${specs.panelThickness}` : ""}
          </span>
        </div>

        {/* Finish + Hinge/Slide Side */}
        <div className="flex items-center gap-4 py-2 border-b border-border-custom">
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-bold uppercase w-28 shrink-0">FINISH</span>
            <span className="text-sm font-semibold">
              {specs.finish || "\u00A0"}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-bold uppercase">
              {isHinged ? "HINGE" : "SLIDE"}
            </span>
            <MfgCheckbox
              label="RIGHT"
              checked={
                isHinged
                  ? specs.hingeSide === "RIGHT"
                  : specs.slideSide === "RIGHT"
              }
            />
            <MfgCheckbox
              label="LEFT"
              checked={
                isHinged
                  ? specs.hingeSide === "LEFT"
                  : specs.slideSide === "LEFT"
              }
            />
          </div>
        </div>

        {/* Hardware — 4-box grid */}
        <div className="py-3 border-b border-border-custom">
          <span className="text-sm font-bold uppercase block mb-2">HARDWARE</span>
          {(() => {
            const closerHw = splitHardwareValue(specs.closerModel)
            const releaseHw = splitHardwareValue(specs.insideRelease)
            return (
              <div className="grid grid-cols-2 gap-2">
                <MfgHardwareBox
                  title="HINGE"
                  manufacturer={specs.hingeMfrName}
                  model={specs.hingeModel}
                  offset={specs.hingeOffset}
                />
                <MfgHardwareBox
                  title="LATCH"
                  manufacturer={specs.latchMfrName}
                  model={specs.latchModel}
                />
                <MfgHardwareBox
                  title="CLOSER"
                  manufacturer={closerHw.manufacturer}
                  model={closerHw.model}
                />
                <MfgHardwareBox
                  title="INSIDE RELEASE"
                  manufacturer={releaseHw.manufacturer}
                  model={releaseHw.model}
                />
              </div>
            )
          })()}
        </div>

        {/* Gasket Type */}
        <div className="py-3 border-b border-border-custom">
          <span className="text-sm font-bold uppercase">GASKET TYPE</span>
          <div className="flex items-center gap-6 mt-1 pl-4">
            <MfgCheckbox
              label="MAGNETIC"
              checked={specs.gasketType === "MAGNETIC"}
            />
            <MfgCheckbox
              label="NEOPRENE"
              checked={specs.gasketType === "NEOPRENE"}
            />
          </div>
        </div>

        {/* Window */}
        {specs.windowSize && (
          <div className="flex items-baseline gap-3 py-2 border-b border-border-custom">
            <span className="text-sm font-bold uppercase w-28 shrink-0">WINDOW</span>
            <span className="text-sm font-semibold">
              {specs.windowSize === "14x14" ? '14" x 14"' : '14" x 24"'}
              {specs.windowHeated ? " (Heated)" : " (Non-Heated)"}
            </span>
          </div>
        )}

        {/* Info line */}
        <MfgField
          label="INFO"
          value={specs.infoLine || specs.specialNotes}
        />
      </div>

      {/* Toggle to full spec sheet */}
      {onToggleView && (
        <div className="px-4 pb-3 print:hidden">
          <button
            onClick={onToggleView}
            className="w-full text-center text-sm text-brand-blue font-medium py-2 hover:underline"
          >
            View Full Spec Sheet
          </button>
        </div>
      )}
    </Card>
  )
}
