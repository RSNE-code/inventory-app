"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  getDoorCategoryLabel,
  getFrameTypeLabel,
  formatDoorSize,
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
    <div className={cn("flex justify-between py-1.5 border-b border-gray-100 last:border-0", className)}>
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-gray-900">{display}</span>
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
          "h-4 w-4 rounded border flex items-center justify-center",
          checked
            ? "bg-navy border-navy text-white"
            : "border-gray-300 bg-white"
        )}
      >
        {checked && <span className="text-[12px] font-bold">&#10003;</span>}
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-bold text-navy uppercase tracking-wider border-b-2 border-navy pb-1 mb-2">
      {children}
    </h4>
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

  return (
    <Card className="rounded-xl border-border-custom overflow-hidden print:shadow-none print:border print:rounded-none">
      {/* Header */}
      <div className="bg-navy text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] uppercase tracking-widest text-gray-300">
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

      <div className="p-4 space-y-4">
        {/* Identity */}
        {(specs.serialNumber || specs.quantity) && (
          <div className="flex gap-4">
            {specs.serialNumber && (
              <div>
                <span className="text-xs text-gray-500">Serial #</span>
                <p className="text-sm font-semibold">{specs.serialNumber}</p>
              </div>
            )}
            {specs.quantity && specs.quantity > 0 && (
              <div>
                <span className="text-xs text-gray-500">Qty</span>
                <p className="text-sm font-semibold">{specs.quantity}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-gray-500">Label</span>
              <p className="text-sm font-semibold">{specs.label ? "Yes" : "No"}</p>
            </div>
          </div>
        )}

        {/* Dimensions */}
        <div>
          <SectionHeader>Dimensions</SectionHeader>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-center mb-2">
              <p className="text-2xl font-bold text-navy">{formatDoorSize(specs) || "---"}</p>
              <p className="text-xs text-gray-500">Size in Clear (W x H)</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SpecRow label="Wall Thickness" value={specs.wallThickness} />
              <SpecRow label="Jamb Depth" value={specs.jambDepth} />
            </div>
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

        {/* Panel & Insulation */}
        <div>
          <SectionHeader>Panel &amp; Insulation</SectionHeader>
          <CheckboxRow label="Door Panel RSNE Insulated" checked={specs.panelInsulated} />
          <SpecRow label="Panel Thickness" value={specs.panelThickness} />
          <SpecRow label="Insulation" value={specs.insulation} />
        </div>

        {/* Finish */}
        <div>
          <SectionHeader>Finish &amp; Skin</SectionHeader>
          <SpecRow label="Finish" value={specs.finish} />
          <SpecRow label="Skin Material" value={specs.skinMaterial} />
        </div>

        {/* Hardware */}
        <div>
          <SectionHeader>Hardware</SectionHeader>
          <div className="space-y-1">
            {(specs.hingeMfrName || specs.hingeModel) && (
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-xs text-gray-500 mb-1">Hinges</p>
                <div className="grid grid-cols-2 gap-2">
                  <SpecRow label="Mfr" value={specs.hingeMfrName} />
                  <SpecRow label="Model" value={specs.hingeModel} />
                  {specs.hingeOffset && <SpecRow label="Offset" value={specs.hingeOffset} />}
                </div>
              </div>
            )}
            {(specs.latchMfrName || specs.latchModel) && (
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-xs text-gray-500 mb-1">Latch</p>
                <div className="grid grid-cols-2 gap-2">
                  <SpecRow label="Mfr" value={specs.latchMfrName} />
                  <SpecRow label="Model" value={specs.latchModel} />
                  {specs.latchOffset && <SpecRow label="Offset" value={specs.latchOffset} />}
                  {specs.insideRelease && <SpecRow label="Inside Release" value={specs.insideRelease} />}
                </div>
              </div>
            )}
            {specs.closerModel && (
              <SpecRow label="Closer" value={specs.closerModel} />
            )}
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
          <div className="flex gap-4">
            <CheckboxRow label="Weather Shield" checked={specs.weatherShield} />
            <CheckboxRow label="Threshold Plate" checked={specs.thresholdPlate} />
          </div>
        </div>

        {/* Special Notes */}
        {specs.specialNotes && (
          <div>
            <SectionHeader>Special Notes</SectionHeader>
            <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
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
              <span className="text-xs text-gray-500">By</span>
              <p className="font-medium border-b border-gray-300 min-h-[1.5rem]">
                {approvedBy || ""}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Date</span>
              <p className="font-medium border-b border-gray-300 min-h-[1.5rem]">
                {approvedAt ? new Date(approvedAt).toLocaleDateString() : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
