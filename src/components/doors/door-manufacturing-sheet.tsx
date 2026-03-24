"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatDoorSize, getFrameTypeLabel } from "@/lib/door-specs"
import type { DoorSpecs } from "@/lib/door-specs"

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
    <div className="flex items-baseline gap-2 py-2 border-b border-border-custom">
      <span className="text-sm font-bold uppercase shrink-0">{label}</span>
      <span
        className={cn(
          "flex-1 border-b border-transparent",
          large ? "text-lg font-bold" : "text-sm font-medium"
        )}
      >
        {value || "\u00A0"}
      </span>
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
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold uppercase">SERIAL #</span>
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
            [specs.jobName, specs.jobSiteName].filter(Boolean).join("\n") ||
            undefined
          }
        />
        {specs.jobSiteName && (
          <div className="pl-20 -mt-1 pb-2 border-b border-border-custom">
            <span className="text-sm font-medium">{specs.jobSiteName}</span>
          </div>
        )}

        {/* Cooler / Freezer */}
        <div className="flex items-center gap-8 py-3 border-b border-border-custom">
          <MfgCheckbox label="COOLER DOOR" checked={!isFreezer} />
          <MfgCheckbox label="FREEZER DOOR" checked={isFreezer} />
        </div>

        {/* Door Size */}
        <div className="flex items-baseline gap-2 py-3 border-b border-border-custom">
          <span className="text-sm font-bold uppercase">DOOR SIZE</span>
          <span className="text-xl font-extrabold tracking-wide">
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
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold uppercase">JAMB DEPTH</span>
            <span className="text-sm font-semibold">
              {specs.jambDepth || "\u00A0"}
            </span>
          </div>
          {isFreezer && (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold uppercase">HEATER SIZE</span>
              <span className="text-sm font-semibold">
                {specs.heaterSize || "\u00A0"}
              </span>
            </div>
          )}
        </div>

        {/* Finish + Hinge/Slide Side */}
        <div className="flex items-center gap-4 py-2 border-b border-border-custom">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold uppercase">FINISH</span>
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

        {/* Hardware */}
        <div className="py-2 border-b border-border-custom space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold uppercase">
              HINGE MFR&apos;S NAME
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-text-secondary">
                {specs.hingeMfrName || "\u00A0"}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-text-secondary">PART #&apos;S</span>
              <span className="text-xs font-medium">
                {specs.closerModel || "\u00A0"}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-text-secondary">HINGE</span>
              <span className="text-xs font-medium">
                {specs.hingeModel || "\u00A0"}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-text-secondary">OFFSET</span>
              <span className="text-xs font-medium">
                {specs.hingeOffset || "\u00A0"}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-text-secondary">LATCH</span>
              <span className="text-xs font-medium">
                {specs.latchModel || "\u00A0"}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-text-secondary">OFFSET</span>
              <span className="text-xs font-medium">
                {specs.latchOffset || "\u00A0"}
              </span>
            </div>
            <div className="col-span-2 flex items-baseline gap-1">
              <span className="text-xs text-text-secondary">INSIDE RELEASE</span>
              <span className="text-xs font-medium">
                {specs.insideRelease || "\u00A0"}
              </span>
            </div>
          </div>
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
