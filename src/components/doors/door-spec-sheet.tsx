"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  getDoorCategoryLabel,
  getFrameTypeLabel,
} from "@/lib/door-specs"
import type { DoorSpecs } from "@/lib/door-specs"
import { CheckCircle, Snowflake, Thermometer } from "lucide-react"

interface DoorSpecSheetProps {
  specs: Partial<DoorSpecs>
  approvedBy?: string
  approvedAt?: string
  approvalStatus?: string
}

function SpecRow({
  label,
  value,
  className,
}: {
  label: string
  value?: string | number | boolean | null
  className?: string
}) {
  if (value === undefined || value === null || value === "") return null
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)
  return (
    <div className={cn("flex justify-between py-2 border-b border-border-custom/40 last:border-0", className)}>
      <span className="text-sm text-text-secondary uppercase tracking-wide">{label}</span>
      <span className="text-base font-medium text-navy">{display}</span>
    </div>
  )
}

function CheckboxRow({
  label,
  checked,
}: {
  label: string
  checked?: boolean
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div
        className={cn(
          "h-5 w-5 rounded border-2 flex items-center justify-center",
          checked
            ? "bg-navy border-navy text-white"
            : "border-border-custom bg-white"
        )}
      >
        {checked && <span className="text-xs font-bold">&#10003;</span>}
      </div>
      <span className="text-sm text-text-primary">{label}</span>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-bold text-navy uppercase tracking-wider border-b-2 border-navy pb-1 mb-3">
      {children}
    </h4>
  )
}

/** Hardware box — one of the 4 boxes in the grid */
function HardwareBox({
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
  const hasData = manufacturer || model
  return (
    <div className="bg-surface-secondary rounded-lg p-3">
      <p className="text-xs font-bold text-navy uppercase tracking-wide mb-2">{title}</p>
      {hasData ? (
        <div className="space-y-1">
          {manufacturer && (
            <div className="flex justify-between">
              <span className="text-xs text-text-muted">Mfr</span>
              <span className="text-sm font-medium text-navy">{manufacturer}</span>
            </div>
          )}
          {model && (
            <div className="flex justify-between">
              <span className="text-xs text-text-muted">Model</span>
              <span className="text-sm font-medium text-navy">{model}</span>
            </div>
          )}
          {offset && (
            <div className="flex justify-between">
              <span className="text-xs text-text-muted">Offset</span>
              <span className="text-sm font-medium text-navy">{offset}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-text-muted italic">Not specified</p>
      )}
    </div>
  )
}

export function DoorSpecSheet({
  specs,
  approvedBy,
  approvedAt,
  approvalStatus,
}: DoorSpecSheetProps) {
  const isFreezer = specs.temperatureType === "FREEZER"
  const isSliding = specs.openingType === "SLIDE"

  // Format dimension with " symbol
  function dim(val?: string) {
    if (!val) return "—"
    return val.includes('"') ? val : `${val}"`
  }

  return (
    <Card className="rounded-xl border-border-custom overflow-hidden print:shadow-none print:border print:rounded-none">
      {/* Header */}
      <div className="bg-navy text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/50">
              Refrigerated Structures of New England
            </p>
            <h3 className="text-base font-bold mt-0.5">
              {specs.doorCategory
                ? getDoorCategoryLabel(specs.doorCategory)
                : "Door Specification Sheet"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isFreezer ? (
              <Badge className="bg-blue-600 text-white text-xs">
                <Snowflake className="h-3 w-3 mr-1" />
                Freezer
              </Badge>
            ) : (
              <Badge className="bg-cyan-600 text-white text-xs">
                <Thermometer className="h-3 w-3 mr-1" />
                Cooler
              </Badge>
            )}
          </div>
        </div>
        {(specs.jobName || specs.jobSiteName || specs.jobNumber) && (
          <div className="mt-2 text-sm text-gray-200">
            {specs.jobName && <span className="font-medium">{specs.jobName}</span>}
            {specs.jobSiteName && <span> &mdash; {specs.jobSiteName}</span>}
            {specs.jobNumber && (
              <span className="ml-3 text-xs bg-white/20 px-2 py-0.5 rounded">
                Job #{specs.jobNumber}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-5">
        {/* Identity */}
        {(specs.serialNumber || specs.quantity) && (
          <div className="flex gap-4">
            {specs.serialNumber && (
              <div>
                <span className="text-xs text-text-secondary">Serial #</span>
                <p className="text-sm font-semibold">{specs.serialNumber}</p>
              </div>
            )}
            {specs.quantity && specs.quantity > 0 && (
              <div>
                <span className="text-xs text-text-secondary">Qty</span>
                <p className="text-sm font-semibold">{specs.quantity}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-text-secondary">Label</span>
              <p className="text-sm font-semibold">{specs.label ? "Yes" : "No"}</p>
            </div>
          </div>
        )}

        {/* Sizing — unified font sizes */}
        <div>
          <SectionHeader>Sizing</SectionHeader>
          <div className="bg-surface-secondary rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Width</p>
                <p className="text-2xl font-bold text-navy tabular-nums">{dim(specs.widthInClear)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Height</p>
                <p className="text-2xl font-bold text-navy tabular-nums">{dim(specs.heightInClear)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Jamb Depth</p>
                <p className="text-2xl font-bold text-navy tabular-nums">{dim(specs.jambDepth)}</p>
              </div>
            </div>
            {specs.wallThickness && (
              <div className="mt-2 pt-2 border-t border-border-custom/40">
                <SpecRow label="Wall Thickness" value={dim(specs.wallThickness)} />
              </div>
            )}
          </div>
        </div>

        {/* Door Configuration */}
        <div>
          <SectionHeader>Door Configuration</SectionHeader>
          <div className="grid grid-cols-2 gap-x-4">
            <SpecRow
              label="Opening"
              value={isSliding ? "Sliding" : "Hinged"}
            />
            <SpecRow
              label={isSliding ? "Slide Side" : "Hinge Side"}
              value={isSliding ? specs.slideSide : specs.hingeSide}
            />
          </div>
          {!isSliding && (
            <>
              <SpecRow label="Frame Type" value={specs.frameType ? getFrameTypeLabel(specs.frameType) : undefined} />
              <div className="flex gap-4 mt-2">
                <CheckboxRow label="High Sill" checked={specs.highSill} />
                <CheckboxRow label="Wiper" checked={specs.wiper} />
              </div>
            </>
          )}
          {isSliding && specs.doorPull && (
            <SpecRow label="Door Pull" value={specs.doorPull} />
          )}
        </div>

        {/* Insulation */}
        <div>
          <SectionHeader>Insulation</SectionHeader>
          {specs.insulationType && (
            <SpecRow label="Type" value={specs.insulationType} />
          )}
          <SpecRow label="Thickness" value={specs.panelThickness ? dim(specs.panelThickness) : specs.insulation} />
          {!specs.insulationType && specs.insulation && (
            <SpecRow label="Material" value={specs.insulation} />
          )}
        </div>

        {/* Finish */}
        <div>
          <SectionHeader>Finish</SectionHeader>
          <div className="bg-surface-secondary rounded-lg p-3">
            <p className="text-xl font-bold text-navy">{specs.finish || "—"}</p>
            {specs.skinMaterial && (
              <p className="text-sm text-text-secondary mt-1">{specs.skinMaterial}</p>
            )}
          </div>
        </div>

        {/* Window */}
        {specs.windowSize && (
          <div>
            <SectionHeader>Window</SectionHeader>
            <SpecRow label="Size" value={specs.windowSize === "14x14" ? '14" x 14"' : '14" x 24"'} />
            <SpecRow label="Heated" value={specs.windowHeated ? "Yes" : "No"} />
          </div>
        )}

        {/* Hardware — 4-box grid */}
        <div>
          <SectionHeader>Hardware</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <HardwareBox
              title="Hinges"
              manufacturer={specs.hingeMfrName}
              model={specs.hingeModel}
              offset={specs.hingeOffset}
            />
            <HardwareBox
              title="Latch"
              manufacturer={specs.latchMfrName}
              model={specs.latchModel}
            />
            <HardwareBox
              title="Closer"
              model={specs.closerModel}
            />
            <HardwareBox
              title="Inside Release"
              model={specs.insideRelease}
            />
          </div>
        </div>

        {/* Heater (freezer only) */}
        {isFreezer && (
          <div>
            <SectionHeader>Heater</SectionHeader>
            <SpecRow label="Heater Size" value={specs.heaterSize} />
            <SpecRow label="Cable Location" value={specs.heaterCableLocation} />
          </div>
        )}

        {/* Gasket */}
        <div>
          <SectionHeader>Gasket</SectionHeader>
          <div className="flex gap-4">
            <CheckboxRow label="Magnetic" checked={specs.gasketType === "MAGNETIC"} />
            <CheckboxRow label="Neoprene" checked={specs.gasketType === "NEOPRENE"} />
          </div>
        </div>

        {/* Options */}
        <div>
          <SectionHeader>Options</SectionHeader>
          <div className="flex gap-4 flex-wrap">
            <CheckboxRow label="Weather Shield" checked={specs.weatherShield} />
            <CheckboxRow label="Threshold Plate" checked={specs.thresholdPlate} />
          </div>
        </div>

        {/* Cutouts */}
        {specs.cutouts && specs.cutouts.length > 0 && (
          <div>
            <SectionHeader>Cutouts ({specs.cutouts.length})</SectionHeader>
            {specs.cutouts.map((c, i) => (
              <div key={i} className="bg-surface-secondary rounded-lg p-3 mb-2 last:mb-0">
                <p className="text-xs font-bold text-navy mb-1">Cutout {i + 1}{c.side ? ` — ${c.side === "LEFT" ? "Left" : c.side === "RIGHT" ? "Right" : "Top"}` : ""}</p>
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

        {/* Special Notes */}
        {specs.specialNotes && (
          <div>
            <SectionHeader>Special Notes</SectionHeader>
            <p className="text-sm text-text-primary bg-status-yellow/10 p-3 rounded-lg border border-status-yellow/30">
              {specs.specialNotes}
            </p>
          </div>
        )}

        {/* Approval Block */}
        <div className="border-t-2 border-navy pt-3 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <CheckboxRow
                label="Approved"
                checked={approvalStatus === "APPROVED"}
              />
              <CheckboxRow
                label="Approved as Noted"
                checked={approvalStatus === "APPROVED" && !!specs.specialNotes}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
            <div>
              <span className="text-xs text-text-secondary">By</span>
              <p className="font-medium border-b border-border-custom min-h-[1.5rem]">
                {approvedBy || ""}
              </p>
            </div>
            <div>
              <span className="text-xs text-text-secondary">Date</span>
              <p className="font-medium border-b border-border-custom min-h-[1.5rem]">
                {approvedAt ? new Date(approvedAt).toLocaleDateString() : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
