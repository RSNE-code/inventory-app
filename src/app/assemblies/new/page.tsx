"use client"

import { useState, useCallback, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAssemblyTemplates, useCreateAssembly } from "@/hooks/use-assemblies"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AIInput } from "@/components/ai/ai-input"
import { DoorCreationFlow } from "@/components/doors/door-creation-flow"
import { StepProgress } from "@/components/layout/step-progress"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { cn, formatQuantity } from "@/lib/utils"
import { toast } from "sonner"
import { useCelebration } from "@/hooks/use-celebration"
import {
  DoorOpen,
  Layers,
  Mic,
  Trash2,
  Plus,
  Factory,
} from "lucide-react"
import type { ParseResult, ReceivingParseResult, CatalogMatch } from "@/lib/ai/types"

type AssemblyType = "DOOR" | "FLOOR_PANEL" | "WALL_PANEL"

interface ComponentItem {
  productId: string
  productName: string
  unitOfMeasure: string
  qtyUsed: number
  currentQty: number
}

const typeOptions: Array<{ value: AssemblyType; label: string; icon: typeof DoorOpen }> = [
  { value: "DOOR", label: "Door", icon: DoorOpen },
  { value: "FLOOR_PANEL", label: "Floor Panel", icon: Layers },
  { value: "WALL_PANEL", label: "Wall Panel", icon: Layers },
]

export default function NewAssemblyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NewAssemblyContent />
    </Suspense>
  )
}

function NewAssemblyContent() {
  const router = useRouter()
  const { celebrate } = useCelebration()
  const { data: templatesData, isLoading: templatesLoading } = useAssemblyTemplates()
  const createAssembly = useCreateAssembly()

  // Read type from URL params to skip type selection screen
  const searchParams = useSearchParams()
  const urlType = searchParams.get("type")

  const [step, setStep] = useState<"type" | "template" | "details" | "door-flow">("type")
  const [assemblyType, setAssemblyType] = useState<AssemblyType | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Route based on URL param — runs once after hydration
  useEffect(() => {
    if (initialized) return
    if (urlType === "DOOR") {
      setStep("door-flow")
      setAssemblyType("DOOR")
    } else if (urlType === "PANEL") {
      setStep("template")
      setAssemblyType("WALL_PANEL")
    }
    setInitialized(true)
  }, [urlType, initialized])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [jobName, setJobName] = useState("")
  const [batchSize, setBatchSize] = useState(1)
  const [notes, setNotes] = useState("")
  const [components, setComponents] = useState<ComponentItem[]>([])

  const templates = templatesData?.data || []
  const filteredTemplates = assemblyType
    ? templates.filter((t: Record<string, unknown>) => t.type === assemblyType)
    : []

  function handleSelectType(type: AssemblyType) {
    setAssemblyType(type)
    if (type === "DOOR") {
      // Door goes straight to AI-first creation flow
      setStep("door-flow")
    } else {
      setStep("template")
    }
  }

  function handleSelectTemplate(template: Record<string, unknown> | null) {
    if (template) {
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
    } else {
      setSelectedTemplateId(null)
      setComponents([])
    }
    setStep("details")
  }

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
      toast.success(`Added ${newComponents.length} component${newComponents.length !== 1 ? "s" : ""}`)
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

  async function handleSubmit() {
    if (!assemblyType) {
      toast.error("Select an assembly type")
      return
    }
    if (components.length === 0) {
      toast.error("Add at least one component")
      return
    }

    try {
      const result = await createAssembly.mutateAsync({
        templateId: selectedTemplateId,
        type: assemblyType,
        specs: null,
        batchSize,
        jobName: jobName.trim() || null,
        notes: notes.trim() || null,
        requiresApproval: false,
        components: components.map((c) => ({
          productId: c.productId,
          qtyUsed: c.qtyUsed,
        })),
      })

      toast.success("Assembly added to fabrication queue")
      celebrate()
      router.push(`/assemblies/${result.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create assembly")
    }
  }

  return (
    <div>
      <Header title={step === "door-flow" ? "New Door" : "New Assembly"} />
      <Breadcrumb items={[
        { label: "Assemblies", href: step === "door-flow" ? "/assemblies?queue=DOOR_SHOP" : "/assemblies" },
        { label: step === "door-flow" ? "New Door" : "New Assembly" },
      ]} />

      <div className="p-4 pb-28 space-y-4 overscroll-fix">
        {/* Wait for URL param routing before rendering content */}
        {!initialized ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : null}

        {/* Step progress — only for panel/floor flow (door has its own inside DoorCreationFlow) */}
        {initialized && step !== "door-flow" && (
          <StepProgress
            steps={["Type", "Template", "Details"]}
            currentStep={step === "type" ? 0 : step === "template" ? 1 : 2}
          />
        )}

        {/* Step 1: Select Type */}
        {initialized && step === "type" && (
          <Card className="p-5 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">What are you building?</h3>
            <div className="grid grid-cols-1 gap-2">
              {typeOptions.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant="outline"
                  onClick={() => handleSelectType(value)}
                  className="h-16 justify-start gap-3 rounded-xl text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/10">
                    <Icon className="h-5 w-5 text-brand-blue" />
                  </div>
                  <span className="font-semibold text-navy">{label}</span>
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* Door: AI-first creation flow */}
        {initialized && step === "door-flow" && assemblyType === "DOOR" && (
          <DoorCreationFlow />
        )}

        {/* Panel/Floor: Template Selection */}
        {initialized && step === "template" && assemblyType && assemblyType !== "DOOR" && (
          <Card className="p-5 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">Select Template</h3>
            <p className="text-sm text-text-secondary">
              Choose an existing template or build a custom assembly
            </p>

            {templatesLoading ? (
              <p className="text-sm text-text-muted">Loading templates...</p>
            ) : (
              <>
                <div className="space-y-2">
                  {filteredTemplates.map((t: Record<string, unknown>) => {
                    const comps = t.components as Array<Record<string, unknown>>
                    return (
                      <Button
                        key={t.id as string}
                        variant="outline"
                        onClick={() => handleSelectTemplate(t)}
                        className="w-full h-auto py-3 justify-start rounded-xl text-left"
                      >
                        <div>
                          <p className="font-semibold text-navy">{t.name as string}</p>
                          <p className="text-xs text-text-secondary">
                            {comps.length} components
                            {t.description ? ` — ${t.description}` : ""}
                          </p>
                        </div>
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  onClick={() => handleSelectTemplate(null)}
                  className="w-full h-14 rounded-xl border-dashed border-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Custom Assembly (No Template)
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setStep("type")}
                  className="w-full text-text-muted"
                >
                  Back
                </Button>
              </>
            )}
          </Card>
        )}

        {/* Panel/Floor: Details */}
        {initialized && step === "details" && assemblyType && assemblyType !== "DOOR" && (
          <>
            {/* Job + Batch */}
            <Card className="p-5 rounded-xl border-border-custom space-y-3">
              <h3 className="font-semibold text-navy">Assignment</h3>
              <div>
                <Label className="text-xs">Job Name</Label>
                <Input
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="Job name or leave empty for stock"
                  className="h-10 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Batch Size</Label>
                <Input
                  type="number"
                  min={1}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value) || 1)}
                  className="h-10 mt-1 w-28"
                />
              </div>
            </Card>

            {/* Components */}
            <Card className="p-5 rounded-xl border-border-custom space-y-3">
              <h3 className="font-semibold text-navy">
                Components ({components.length})
              </h3>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-brand-orange" />
                  <p className="text-xs text-text-secondary">Add materials by voice or text</p>
                </div>
                <AIInput
                  onParseComplete={handleAIAddComponents}
                  placeholder={`"4in IMP panels, gasket roll, 2 sets hinges..."`}
                />
              </div>

              {components.length > 0 && (
                <div className="space-y-1">
                  {components.map((comp, index) => {
                    const totalQty = comp.qtyUsed * batchSize
                    const hasEnough = comp.currentQty >= totalQty
                    return (
                      <div
                        key={`${comp.productId}-${index}`}
                        className="flex items-center justify-between py-2 border-b border-border-custom/40 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy truncate">
                            {comp.productName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                hasEnough ? "bg-green-500" : "bg-red-500"
                              )}
                            />
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
                            onChange={(e) =>
                              handleComponentQtyChange(index, Number(e.target.value) || 0)
                            }
                            className="w-16 rounded-xl border border-border-custom px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-xs text-text-secondary w-8">{comp.unitOfMeasure}</span>
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
                  {batchSize > 1 && (
                    <p className="text-xs text-text-muted pt-1">
                      Quantities shown per unit. Total = qty x {batchSize} batch size
                    </p>
                  )}
                </div>
              )}

              {components.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">
                  Use AI input above or add components from the catalog
                </p>
              )}
            </Card>

            {/* Notes */}
            <Card className="p-5 rounded-xl border-border-custom space-y-2">
              <Label className="text-xs">Notes</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full rounded-xl border border-border-custom p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </Card>

            {/* Submit */}
            <div className="space-y-2">
              <Button
                onClick={handleSubmit}
                disabled={createAssembly.isPending || components.length === 0}
                className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
              >
                <Factory className="h-5 w-5 mr-2" />
                {createAssembly.isPending
                  ? "Creating..."
                  : `Add to Fabrication Queue (${components.length} components)`}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep("template")}
                className="w-full text-text-muted"
              >
                Back
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
