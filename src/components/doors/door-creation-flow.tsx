"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useCreateAssembly, useAssemblyTemplates } from "@/hooks/use-assemblies"
import { AIInput } from "@/components/ai/ai-input"
import { DoorSpecSheet } from "@/components/doors/door-spec-sheet"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Mic,
  Pencil,
  RefreshCw,
  Send,
  ChevronRight,
  Factory,
  Loader2,
  Trash2,
} from "lucide-react"
import type {
  DoorSpecs,
  GapQuestion,
} from "@/lib/door-specs"
import {
  findSpecGaps,
  getDefaultSpecs,
  getStandardHardware,
  resolveGapAnswer,
  FIELD_METADATA,
} from "@/lib/door-specs"
import { StepProgress } from "@/components/layout/step-progress"
import type { ParseResult, ReceivingParseResult, CatalogMatch } from "@/lib/ai/types"
import { formatQuantity } from "@/lib/utils"

type Phase = "INPUT" | "REVIEW" | "CONFIRM"

const DOOR_STEPS = ["Describe", "Review", "Confirm"]
const PHASE_INDEX: Record<Phase, number> = { INPUT: 0, REVIEW: 1, CONFIRM: 2 }

interface ComponentItem {
  productId: string
  productName: string
  unitOfMeasure: string
  qtyUsed: number
  currentQty: number
}

export function DoorCreationFlow() {
  const router = useRouter()
  const createAssembly = useCreateAssembly()
  const { data: templatesData } = useAssemblyTemplates()

  const [phase, setPhase] = useState<Phase>("INPUT")
  const [specs, setSpecs] = useState<Partial<DoorSpecs>>(getDefaultSpecs())
  const [gaps, setGaps] = useState<GapQuestion[]>([])
  const [confidence, setConfidence] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  // Job & components
  const [jobName, setJobName] = useState("")
  const [notes, setNotes] = useState("")
  const [components, setComponents] = useState<ComponentItem[]>([])

  // Template pre-fill
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const templates = templatesData?.data || []
  const doorTemplates = templates.filter(
    (t: Record<string, unknown>) => t.type === "DOOR"
  )

  // Parse door specs via AI
  async function handleDoorSpecInput(text: string) {
    if (!text.trim()) return
    setIsProcessing(true)
    try {
      const res = await fetch("/api/ai/parse-door-specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to parse door specs")
      }
      const { data } = await res.json()
      setSpecs((prev) => ({ ...prev, ...data.specs }))
      setGaps(data.gaps)
      setConfidence(data.confidence)
      setPhase("REVIEW")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to parse door specs"
      )
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle gap answer from tappable option
  function handleGapAnswer(field: string, answer: string) {
    const resolved = resolveGapAnswer(field, answer)
    const newSpecs = { ...specs, ...resolved }

    // Re-apply hardware defaults when door type or size changes
    if (field === "doorCategory" || field === "widthInClear" || field === "temperatureType" || field === "openingType") {
      const hw = getStandardHardware(newSpecs.doorCategory, newSpecs.widthInClear)
      if (hw.hingeMfrName && !newSpecs.hingeMfrName) newSpecs.hingeMfrName = hw.hingeMfrName
      if (hw.hingeModel && !newSpecs.hingeModel) newSpecs.hingeModel = hw.hingeModel
      if (hw.latchMfrName && !newSpecs.latchMfrName) newSpecs.latchMfrName = hw.latchMfrName
      if (hw.latchModel && !newSpecs.latchModel) newSpecs.latchModel = hw.latchModel
      if (hw.closerModel && !newSpecs.closerModel) newSpecs.closerModel = hw.closerModel
      if (hw.gasketType && !newSpecs.gasketType) newSpecs.gasketType = hw.gasketType
    }

    setSpecs(newSpecs)

    // Recalculate gaps
    const newGaps = findSpecGaps(newSpecs, newSpecs.doorCategory)
    setGaps(newGaps)
  }

  // AI-parsed items → add to components
  const handleAIAddComponents = useCallback(
    (result: ParseResult | ReceivingParseResult) => {
      const newComponents: ComponentItem[] = result.items
        .filter((m: CatalogMatch) => !m.isNonCatalog && m.matchedProduct)
        .map((m: CatalogMatch) => ({
          productId: m.matchedProduct!.id,
          productName: m.matchedProduct!.name,
          unitOfMeasure: m.matchedProduct!.unitOfMeasure,
          qtyUsed: m.parsedItem.quantity,
          currentQty: m.matchedProduct!.currentQty,
        }))
      if (newComponents.length === 0) {
        toast.error("No catalog items recognized")
        return
      }
      setComponents((prev) => [...prev, ...newComponents])
      toast.success(
        `Added ${newComponents.length} component${newComponents.length !== 1 ? "s" : ""}`
      )
    },
    []
  )

  function handleRemoveComponent(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index))
  }

  function handleComponentQtyChange(index: number, qty: number) {
    setComponents((prev) =>
      prev.map((c, i) => (i === index ? { ...c, qtyUsed: qty } : c))
    )
  }

  // Handle template selection — pre-fill components and specs
  function handleSelectTemplate(template: Record<string, unknown>) {
    setSelectedTemplateId(template.id as string)
    const templateComps = template.components as Array<Record<string, unknown>>
    setComponents(
      templateComps.map((c) => {
        const product = c.product as Record<string, unknown>
        return {
          productId: product.id as string,
          productName: product.name as string,
          unitOfMeasure: product.unitOfMeasure as string,
          qtyUsed: Number(c.qtyPerUnit),
          currentQty: Number(product.currentQty),
        }
      })
    )
    const templateSpecs = template.specs as Record<string, unknown> | null
    const templateName = (template.name as string) || ""

    // Derive door category and dimensions from template name
    const isSlider = templateName.toLowerCase().includes("slider")
    const isFreezer = templateName.toLowerCase().includes("freezer")
    const isExterior = templateName.toLowerCase().includes("exterior")
    const sizeMatch = templateName.match(/(\d+)'\s*x\s*(\d+)'/)
    const widthFt = sizeMatch ? sizeMatch[1] : undefined
    const widthInClear = widthFt ? `${parseInt(widthFt, 10) * 12}` : undefined

    let doorCategory: DoorSpecs["doorCategory"] | undefined
    if (isSlider) doorCategory = "SLIDING"
    else if (isFreezer) doorCategory = "HINGED_FREEZER"
    else doorCategory = "HINGED_COOLER"

    // Get standard hardware for this door type and size
    const hw = getStandardHardware(doorCategory, widthInClear, isExterior)

    const newSpecs: Partial<DoorSpecs> = {
      ...specs,
      ...(templateSpecs || {}),
      doorCategory,
      temperatureType: isFreezer ? "FREEZER" : "COOLER",
      openingType: isSlider ? "SLIDE" : "HINGE",
      ...(widthInClear ? { widthInClear } : {}),
      ...(sizeMatch ? { heightInClear: `${parseInt(sizeMatch[2], 10) * 12}` } : {}),
      ...(hw.hingeMfrName ? { hingeMfrName: hw.hingeMfrName } : {}),
      ...(hw.hingeModel ? { hingeModel: hw.hingeModel } : {}),
      ...(hw.latchMfrName ? { latchMfrName: hw.latchMfrName } : {}),
      ...(hw.latchModel ? { latchModel: hw.latchModel } : {}),
      ...(hw.closerModel ? { closerModel: hw.closerModel } : {}),
      ...(hw.gasketType ? { gasketType: hw.gasketType } : {}),
    }
    setSpecs(newSpecs)

    // Recalculate gaps with the new specs
    const newGaps = findSpecGaps(newSpecs, newSpecs.doorCategory)
    setGaps(newGaps)
    setPhase("REVIEW")
  }

  // Submit to create assembly
  async function handleSubmit() {
    if (!specs.doorCategory) {
      toast.error("Door category is required")
      return
    }

    const finalSpecs = { ...specs }
    if (jobName.trim()) {
      finalSpecs.jobName = finalSpecs.jobName || jobName.trim()
    }

    try {
      const result = await createAssembly.mutateAsync({
        templateId: selectedTemplateId,
        type: "DOOR",
        specs: finalSpecs as Record<string, unknown>,
        batchSize: 1,
        jobName: jobName.trim() || finalSpecs.jobName || null,
        notes: notes.trim() || null,
        requiresApproval: true,
        components: components.map((c) => ({
          productId: c.productId,
          qtyUsed: c.qtyUsed,
        })),
      })
      toast.success("Door sheet submitted for approval")
      router.push(`/assemblies/${result.data.id}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create door"
      )
    }
  }

  function handleStartEdit(field: string, currentValue: unknown) {
    setEditingField(field)
    setEditValue(currentValue != null ? String(currentValue) : "")
  }

  function handleSaveEdit() {
    if (editingField) {
      const newSpecs = { ...specs, [editingField]: editValue || undefined }
      setSpecs(newSpecs)
      setGaps(findSpecGaps(newSpecs, newSpecs.doorCategory))
      setEditingField(null)
      setEditValue("")
    }
  }

  function handleCancelEdit() {
    setEditingField(null)
    setEditValue("")
  }

  const hasRequiredGaps = gaps.length > 0

  return (
    <div className="space-y-4">
      <StepProgress steps={DOOR_STEPS} currentStep={PHASE_INDEX[phase]} />

      {/* INPUT Phase */}
      {phase === "INPUT" && (
        <>
          <Card className="p-4 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">Describe the Door</h3>
            <p className="text-xs text-gray-500">
              Speak or type the door specifications. Include size, type
              (cooler/freezer), frame, hardware, finish, and any special notes.
            </p>

            {isProcessing ? (
              <div className="flex items-center justify-center py-8 gap-2 text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">
                  Parsing door specs...
                </span>
              </div>
            ) : (
              <DoorSpecTextInput onSubmit={handleDoorSpecInput} />
            )}
          </Card>

          {/* Optional: select a template to pre-fill */}
          {doorTemplates.length > 0 && (
            <Card className="p-4 rounded-xl border-border-custom space-y-3">
              <h3 className="font-semibold text-navy text-sm">
                Or Start from Template
              </h3>
              <div className="space-y-2">
                {doorTemplates.map((t: Record<string, unknown>) => (
                  <Button
                    key={t.id as string}
                    variant="outline"
                    onClick={() => {
                      handleSelectTemplate(t)
                      setPhase("REVIEW")
                    }}
                    className="w-full h-auto py-2.5 justify-start rounded-xl text-left"
                  >
                    <p className="font-semibold text-navy text-sm">
                      {t.name as string}
                    </p>
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* REVIEW Phase */}
      {phase === "REVIEW" && (
        <>
          {/* Confidence badge */}
          <div className="flex items-center justify-between">
            <Badge
              className={cn(
                "text-xs px-2 py-0.5",
                confidence >= 0.8
                  ? "bg-green-100 text-green-700"
                  : confidence >= 0.5
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              )}
            >
              {Math.round(confidence * 100)}% complete
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPhase("INPUT")}
              className="text-gray-400 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Re-describe
            </Button>
          </div>

          {/* Editable spec sheet */}
          <Card className="p-4 rounded-xl border-border-custom space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-navy text-sm">Door Specifications</h3>
              <span className="text-[10px] text-gray-400">Tap any field to edit</span>
            </div>
            {Object.entries(specs)
              .filter(([, v]) => v !== undefined && v !== null && v !== "")
              .map(([field, value]) => {
                const meta = FIELD_METADATA[field]
                const label = meta?.label || field.replace(/([A-Z])/g, " $1").trim()
                const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)

                if (editingField === field) {
                  return (
                    <div key={field} className="flex items-center gap-2 py-1.5 border-b border-gray-50">
                      <span className="text-xs text-text-muted w-28 shrink-0">{label}</span>
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit()
                          if (e.key === "Escape") handleCancelEdit()
                        }}
                      />
                      <Button size="sm" onClick={handleSaveEdit} className="h-8 px-2 text-xs bg-brand-blue text-white">
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 px-2 text-xs">
                        Cancel
                      </Button>
                    </div>
                  )
                }

                return (
                  <button
                    key={field}
                    onClick={() => handleStartEdit(field, value)}
                    className="flex items-center justify-between w-full py-1.5 border-b border-gray-50 last:border-0 text-left hover:bg-gray-50 rounded px-1 -mx-1 transition-colors"
                  >
                    <span className="text-xs text-text-muted w-28 shrink-0">{label}</span>
                    <span className="text-sm font-medium text-navy flex-1">{displayValue}</span>
                    <Pencil className="h-3 w-3 text-gray-300 shrink-0 ml-2" />
                  </button>
                )
              })}
          </Card>

          {/* Gap questions */}
          {gaps.length > 0 && (
            <Card className="p-4 rounded-xl border-yellow-300 border-2 space-y-3">
              <h3 className="font-semibold text-navy text-sm">
                Missing Information ({gaps.length})
              </h3>
              <p className="text-xs text-gray-500">
                Tap an answer or type to fill in the gaps
              </p>
              <div className="space-y-3">
                {gaps.map((gap) => (
                  <GapCard
                    key={gap.field}
                    gap={gap}
                    onAnswer={(answer) => handleGapAnswer(gap.field, answer)}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Proceed to confirm */}
          <Button
            onClick={() => setPhase("CONFIRM")}
            disabled={hasRequiredGaps}
            className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl"
          >
            <ChevronRight className="h-4 w-4 mr-1.5" />
            {hasRequiredGaps
              ? `Fill ${gaps.length} missing field${gaps.length !== 1 ? "s" : ""}`
              : "Continue to Submit"}
          </Button>
        </>
      )}

      {/* CONFIRM Phase */}
      {phase === "CONFIRM" && (
        <>
          {/* Final spec sheet */}
          <DoorSpecSheet specs={specs} />

          {/* Job Name */}
          <Card className="p-4 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">Assignment</h3>
            <div>
              <Label className="text-xs">Job Name</Label>
              <Input
                value={jobName || specs.jobName || ""}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="Job name or leave empty for stock"
                className="h-10 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full rounded-lg border border-border-custom p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue mt-1"
              />
            </div>
          </Card>

          {/* Components */}
          <Card className="p-4 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">
              Components ({components.length})
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-[#E8792B]" />
                <p className="text-xs text-gray-500">
                  Add materials by voice or text
                </p>
              </div>
              <AIInput
                onParseComplete={handleAIAddComponents}
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
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {comp.productName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              hasEnough ? "bg-green-500" : "bg-red-500"
                            )}
                          />
                          <span
                            className={cn(
                              "text-xs",
                              hasEnough ? "text-green-600" : "text-red-500"
                            )}
                          >
                            {formatQuantity(comp.currentQty)}{" "}
                            {comp.unitOfMeasure} in stock
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={comp.qtyUsed}
                          onChange={(e) =>
                            handleComponentQtyChange(
                              index,
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-500 w-8">
                          {comp.unitOfMeasure}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveComponent(index)}
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
              <p className="text-sm text-gray-400 text-center py-4">
                Add components from the catalog or skip for now
              </p>
            )}
          </Card>

          {/* Submit */}
          <div className="space-y-2">
            <Button
              onClick={handleSubmit}
              disabled={createAssembly.isPending}
              className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
            >
              <Factory className="h-5 w-5 mr-2" />
              {createAssembly.isPending
                ? "Creating..."
                : "Submit Door Sheet for Approval"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPhase("REVIEW")}
              className="w-full text-gray-400"
            >
              Back to Review
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ---- Sub-components ----

/** Simple text input for door specs (not the full AIInput — we call our own endpoint) */
function DoorSpecTextInput({
  onSubmit,
}: {
  onSubmit: (text: string) => void
}) {
  const [text, setText] = useState("")

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (text.trim()) onSubmit(text.trim())
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='e.g., "36x77 freezer door, face frame, Dent hinges D690CS, right hinge, WPG finish, magnetic gasket, 32ft heater, 2in jamb"'
        rows={3}
        className="w-full resize-none rounded-t-xl px-4 py-3 text-base border-0 focus:ring-0 focus:outline-none placeholder:text-gray-400"
      />
      <div className="flex justify-end px-3 py-2 border-t border-gray-100">
        <Button
          type="button"
          size="icon"
          className="h-10 w-10 rounded-full bg-[#E8792B] hover:bg-[#D06820]"
          onClick={() => {
            if (text.trim()) onSubmit(text.trim())
          }}
          disabled={!text.trim()}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

/** Tappable card for answering a gap question */
function GapCard({
  gap,
  onAnswer,
}: {
  gap: GapQuestion
  onAnswer: (answer: string) => void
}) {
  const [customValue, setCustomValue] = useState("")

  return (
    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
      <p className="text-sm font-medium text-gray-900 mb-2">{gap.question}</p>
      {gap.options ? (
        <div className="flex flex-wrap gap-2">
          {gap.options.map((opt) => (
            <button
              key={opt}
              onClick={() => onAnswer(opt)}
              className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-medium hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customValue.trim()) {
                onAnswer(customValue.trim())
                setCustomValue("")
              }
            }}
            placeholder="Type your answer..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (customValue.trim()) {
                onAnswer(customValue.trim())
                setCustomValue("")
              }
            }}
            disabled={!customValue.trim()}
            className="bg-brand-blue text-white"
          >
            OK
          </Button>
        </div>
      )}
    </div>
  )
}
