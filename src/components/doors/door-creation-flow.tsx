"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useCreateAssembly, useAssemblyTemplates } from "@/hooks/use-assemblies"
import { DoorBuilder } from "./door-builder"
import { DoorConfirmation } from "./door-confirmation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StepProgress } from "@/components/layout/step-progress"
import { toast } from "sonner"
import { useCelebration } from "@/hooks/use-celebration"
import { Hammer, LayoutTemplate } from "lucide-react"
import type { DoorSpecs } from "@/lib/door-specs"
import { getDefaultSpecs, getStandardHardware } from "@/lib/door-specs"
import type { ParseResult, ReceivingParseResult, CatalogMatch } from "@/lib/ai/types"

type FlowPhase = "ENTRY" | "TEMPLATE_SELECT" | "BUILDER" | "CONFIRM"

const FLOW_STEPS = ["Choose", "Build", "Confirm"]
const PHASE_INDEX: Record<FlowPhase, number> = {
  ENTRY: 0,
  TEMPLATE_SELECT: 1,
  BUILDER: 1,
  CONFIRM: 2,
}

interface ComponentItem {
  productId: string
  productName: string
  unitOfMeasure: string
  qtyUsed: number
  currentQty: number
}

export function DoorCreationFlow() {
  const router = useRouter()
  const { celebrate } = useCelebration()
  const createAssembly = useCreateAssembly()
  const { data: templatesData } = useAssemblyTemplates()

  const [phase, setPhase] = useState<FlowPhase>("ENTRY")
  const [specs, setSpecs] = useState<Partial<DoorSpecs>>(getDefaultSpecs())
  const [entryPath, setEntryPath] = useState<"TEMPLATE" | "BUILDER" | null>(null)

  // Job & components
  const [jobName, setJobName] = useState("")
  const [notes, setNotes] = useState("")
  const [components, setComponents] = useState<ComponentItem[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const templates = templatesData?.data || []
  const doorTemplates = templates.filter(
    (t: Record<string, unknown>) => t.type === "DOOR"
  )

  // Builder completes → go to CONFIRM
  function handleBuilderComplete(builderSpecs: Partial<DoorSpecs>) {
    setSpecs((prev) => ({ ...prev, ...builderSpecs }))
    setPhase("CONFIRM")
  }

  // Template selection
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

    const hw = getStandardHardware(doorCategory, widthInClear, isExterior)

    const newSpecs: Partial<DoorSpecs> = {
      ...getDefaultSpecs(),
      ...(templateSpecs || {}),
      doorCategory,
      temperatureType: isFreezer ? "FREEZER" : "COOLER",
      openingType: isSlider ? "SLIDE" : "HINGE",
      ...(!isSlider ? { frameType: "FULL_FRAME" as const } : {}),
      isExterior: isExterior || undefined,
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
    setPhase("CONFIRM")
  }

  // Spec field change from confirmation screen
  function handleSpecChange(field: string, value: unknown) {
    setSpecs((prev) => ({ ...prev, [field]: value }))
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
      celebrate()
      router.push(`/assemblies/${result.data.id}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create door"
      )
    }
  }

  function handleConfirmBack() {
    if (entryPath === "BUILDER") setPhase("BUILDER")
    else if (entryPath === "TEMPLATE") setPhase("TEMPLATE_SELECT")
    else setPhase("ENTRY")
  }

  return (
    <div className="space-y-4">
      {/* Step progress for ENTRY and TEMPLATE_SELECT only — Builder has its own */}
      {(phase === "ENTRY" || phase === "TEMPLATE_SELECT" || phase === "CONFIRM") && (
        <StepProgress steps={FLOW_STEPS} currentStep={PHASE_INDEX[phase]} />
      )}

      {/* ── ENTRY: Choose Path ── */}
      {phase === "ENTRY" && (
        <div className="space-y-3">
          <Card
            className="p-6 rounded-xl border-border-custom cursor-pointer hover:border-brand-blue hover:bg-blue-50/30 transition-all"
            onClick={() => {
              setEntryPath("BUILDER")
              setPhase("BUILDER")
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <Hammer className="h-6 w-6 text-brand-blue" />
              </div>
              <div>
                <h3 className="font-bold text-navy text-lg">Door Builder</h3>
                <p className="text-sm text-text-secondary">
                  Step-by-step guided interview
                </p>
              </div>
            </div>
          </Card>

          {doorTemplates.length > 0 && (
            <Card
              className="p-6 rounded-xl border-border-custom cursor-pointer hover:border-brand-blue hover:bg-blue-50/30 transition-all"
              onClick={() => {
                setEntryPath("TEMPLATE")
                setPhase("TEMPLATE_SELECT")
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                  <LayoutTemplate className="h-6 w-6 text-[#E8792B]" />
                </div>
                <div>
                  <h3 className="font-bold text-navy text-lg">Use Template</h3>
                  <p className="text-sm text-text-secondary">
                    Start from a pre-built door spec
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── TEMPLATE SELECT ── */}
      {phase === "TEMPLATE_SELECT" && (
        <div className="space-y-3">
          <Card className="p-4 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">Select a Door Template</h3>
            <div className="space-y-2">
              {doorTemplates.map((t: Record<string, unknown>) => (
                <Button
                  key={t.id as string}
                  variant="outline"
                  onClick={() => handleSelectTemplate(t)}
                  className="w-full h-auto py-2.5 justify-start rounded-xl text-left"
                >
                  <p className="font-semibold text-navy text-sm">
                    {t.name as string}
                  </p>
                </Button>
              ))}
            </div>
          </Card>
          <Button
            variant="ghost"
            onClick={() => setPhase("ENTRY")}
            className="w-full text-text-muted"
          >
            Back
          </Button>
        </div>
      )}

      {/* ── BUILDER ── */}
      {phase === "BUILDER" && (
        <DoorBuilder
          onComplete={handleBuilderComplete}
          onBack={() => setPhase("ENTRY")}
        />
      )}

      {/* ── CONFIRM ── */}
      {phase === "CONFIRM" && (
        <DoorConfirmation
          specs={specs}
          onSpecChange={handleSpecChange}
          components={components}
          onComponentChange={handleComponentQtyChange}
          onRemoveComponent={handleRemoveComponent}
          onAddComponents={handleAIAddComponents}
          jobName={jobName}
          onJobNameChange={setJobName}
          notes={notes}
          onNotesChange={setNotes}
          onSubmit={handleSubmit}
          isSubmitting={createAssembly.isPending}
          onBack={handleConfirmBack}
        />
      )}
    </div>
  )
}
