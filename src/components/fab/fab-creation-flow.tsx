"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCreateAssembly } from "@/hooks/use-assemblies"
import { useAssemblyTemplates } from "@/hooks/use-assemblies"
import { useJobs } from "@/hooks/use-jobs"
import { PanelSpecForm } from "./panel-spec-form"
import { RampSpecForm } from "./ramp-spec-form"
import { ComponentList, type ComponentItem } from "./component-list"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StepProgress } from "@/components/layout/step-progress"
import { toast } from "sonner"
import { useCelebration } from "@/hooks/use-celebration"
import {
  Search,
  Briefcase,
  ChevronLeft,
  Layers,
  Triangle,
  Factory,
  Minus,
  Plus,
} from "lucide-react"
import {
  getDefaultPanelSpecs,
  getDefaultRampSpecs,
  matchPanelRecipe,
  matchRampRecipe,
  type PanelSpecs,
  type RampSpecs,
} from "@/lib/panel-specs"

type FabType = "WALL_PANEL" | "FLOOR_PANEL" | "RAMP"
type FlowPhase = "JOB" | "TYPE" | "TEMPLATE" | "SPECS" | "REVIEW"

const FLOW_STEPS = ["Job", "Type", "Specs", "Review"]
const PHASE_INDEX: Record<FlowPhase, number> = {
  JOB: 0,
  TYPE: 1,
  TEMPLATE: 1, // Template is part of the Type step visually
  SPECS: 2,
  REVIEW: 3,
}

const FAB_TYPES: { value: FabType; label: string; icon: typeof Layers }[] = [
  { value: "WALL_PANEL", label: "Wall Panel", icon: Layers },
  { value: "FLOOR_PANEL", label: "Floor Panel", icon: Layers },
  { value: "RAMP", label: "Ramp", icon: Triangle },
]

export function FabCreationFlow() {
  const router = useRouter()
  const { celebrate } = useCelebration()
  const createAssembly = useCreateAssembly()
  const { data: templatesData, isLoading: templatesLoading } = useAssemblyTemplates()

  // Flow state
  const [phase, setPhase] = useState<FlowPhase>("JOB")
  const [fabType, setFabType] = useState<FabType | null>(null)

  // Job
  const [jobSearch, setJobSearch] = useState("")
  const [jobName, setJobName] = useState("")
  const [jobNumber, setJobNumber] = useState("")
  const { data: jobsData, isLoading: jobsLoading } = useJobs(jobSearch || undefined)
  const jobs = (jobsData?.data || []) as Array<{ id: string; name: string; number?: string; client?: string }>

  // Template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  // Specs
  const [panelSpecs, setPanelSpecs] = useState<PanelSpecs>(getDefaultPanelSpecs("WALL_PANEL"))
  const [rampSpecs, setRampSpecs] = useState<RampSpecs>(getDefaultRampSpecs())

  // Components & submission
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState("")
  const [components, setComponents] = useState<ComponentItem[]>([])
  const [loadingRecipe, setLoadingRecipe] = useState(false)

  const templates = templatesData?.data || []

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [phase])

  // ── Template filtering ──

  const filteredTemplates = fabType
    ? templates.filter((t: Record<string, unknown>) => t.type === fabType)
    : []

  // ── Recipe loading ──

  async function loadRecipeComponents(recipe: { name: string; qty: number }[]): Promise<ComponentItem[]> {
    if (recipe.length === 0) return []
    try {
      const names = recipe.map((c) => c.name).join("|")
      const res = await fetch(`/api/products/bulk-lookup?names=${encodeURIComponent(names)}`)
      if (!res.ok) return []
      const json = await res.json()
      const lookupResults = json.data as Array<{
        requestedName: string
        product: { id: string; name: string; unitOfMeasure: string; currentQty: number } | null
      }>
      const autoComponents: ComponentItem[] = []
      for (const recipeComp of recipe) {
        const match = lookupResults.find((r) => r.requestedName === recipeComp.name)
        if (match?.product) {
          autoComponents.push({
            productId: match.product.id,
            productName: match.product.name,
            unitOfMeasure: match.product.unitOfMeasure,
            qtyUsed: recipeComp.qty,
            currentQty: match.product.currentQty,
          })
        }
      }
      return autoComponents
    } catch {
      return []
    }
  }

  // ── Phase handlers ──

  function handleSelectType(type: FabType) {
    setFabType(type)
    if (type === "WALL_PANEL" || type === "FLOOR_PANEL") {
      setPanelSpecs(getDefaultPanelSpecs(type))
      // Check if templates exist for this type
      const typeTemplates = templates.filter((t: Record<string, unknown>) => t.type === type)
      if (typeTemplates.length > 0) {
        setPhase("TEMPLATE")
      } else {
        setPhase("SPECS")
      }
    } else {
      // RAMP — go straight to specs (no templates yet)
      setRampSpecs(getDefaultRampSpecs())
      setPhase("SPECS")
    }
  }

  function handleSelectTemplate(template: Record<string, unknown> | null) {
    if (template) {
      setSelectedTemplateId(template.id as string)
      // Pre-fill specs from template
      const templateSpecs = template.specs as Record<string, string> | null
      if (templateSpecs && fabType) {
        // Map template specs to our PanelSpecs format
        const size = templateSpecs.size || ""
        const [wPart, lPart] = size.split("x").map((s) => s.trim().replace("'", ""))
        const widthFt = parseFloat(wPart) || 4
        const lengthFt = parseFloat(lPart) || 8

        const insMatch = (templateSpecs.insulation || "").match(/(EPS|PIR|Dow|Trymer)\s*(\d+\.?\d*)?/)
        const insType = insMatch?.[1] === "Trymer" ? "PIR" : (insMatch?.[1] || "EPS")
        const insThickness = insMatch?.[2] || ""

        setPanelSpecs({
          width: String(widthFt * 12),
          length: String(lengthFt * 12),
          insulation: insType,
          insulationThickness: insThickness,
          side1Material: templateSpecs.finish?.includes("Diamond") ? "None" : "FRP",
          side2Material: templateSpecs.finish?.includes("Diamond") ? "None" : "FRP",
        })
      }
      // Pre-fill components from template
      const templateComps = template.components as Array<Record<string, unknown>>
      if (templateComps) {
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
      }
    } else {
      setSelectedTemplateId(null)
      setComponents([])
    }
    setPhase("SPECS")
  }

  async function handleSpecsContinue() {
    // Auto-calculate components from specs if no template was selected
    if (!selectedTemplateId && components.length === 0) {
      setLoadingRecipe(true)
      let recipe: { name: string; qty: number }[] = []

      if (fabType === "RAMP") {
        recipe = matchRampRecipe(rampSpecs)
      } else if (fabType === "WALL_PANEL" || fabType === "FLOOR_PANEL") {
        recipe = matchPanelRecipe(panelSpecs, fabType)
      }

      if (recipe.length > 0) {
        const autoComponents = await loadRecipeComponents(recipe)
        if (autoComponents.length > 0) {
          setComponents(autoComponents)
          toast.success(`Auto-added ${autoComponents.length} components`)
        }
      }
      setLoadingRecipe(false)
    }

    setPhase("REVIEW")
  }

  // ── Component handlers ──

  const handleAddComponent = useCallback(
    (product: { id: string; name: string; unitOfMeasure: string; currentQty: number }) => {
      setComponents((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unitOfMeasure: product.unitOfMeasure,
          qtyUsed: 1,
          currentQty: product.currentQty,
        },
      ])
      toast.success(`Added ${product.name}`)
    },
    []
  )

  function handleRemoveComponent(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index))
  }

  function handleComponentQtyChange(index: number, qty: number) {
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, qtyUsed: qty } : c)))
  }

  // ── Submit ──

  async function handleSubmit() {
    if (!fabType) {
      toast.error("Select an assembly type")
      return
    }
    if (components.length === 0) {
      toast.error("Add at least one component")
      return
    }

    // Build specs for storage
    const specsToStore = fabType === "RAMP"
      ? { ...rampSpecs, assemblyKind: "RAMP" }
      : { ...panelSpecs, assemblyKind: fabType }

    try {
      const result = await createAssembly.mutateAsync({
        templateId: selectedTemplateId,
        type: fabType,
        specs: specsToStore,
        batchSize: quantity,
        jobName: jobName.trim() || null,
        jobNumber: jobNumber.trim() || null,
        notes: notes.trim() || null,
        requiresApproval: false,
        components: components.map((c) => ({
          productId: c.productId,
          qtyUsed: c.qtyUsed,
        })),
      })

      toast.success("Added to fabrication queue")
      celebrate()
      router.push(`/assemblies/${result.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create assembly")
    }
  }

  // ── Navigation ──

  function handleStepClick(stepIndex: number) {
    const current = PHASE_INDEX[phase]
    if (stepIndex >= current) return
    if (stepIndex === 0) setPhase("JOB")
    else if (stepIndex === 1) setPhase(fabType ? "TYPE" : "JOB")
    else if (stepIndex === 2) setPhase("SPECS")
  }

  const currentStep = PHASE_INDEX[phase]
  const typeLabel = fabType
    ? FAB_TYPES.find((t) => t.value === fabType)?.label || fabType
    : ""

  return (
    <div className="space-y-4">
      <StepProgress
        steps={FLOW_STEPS}
        currentStep={currentStep}
        onStepClick={handleStepClick}
      />

      {/* ── JOB SELECTION ── */}
      {phase === "JOB" && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className="text-center space-y-1 px-2">
            <h2 className="text-xl font-bold text-navy">Select Job</h2>
            <p className="text-sm text-text-secondary">Which job is this for?</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              placeholder="Search jobs..."
              className="pl-10 h-12 rounded-xl border-2 border-border-custom focus:border-brand-blue"
            />
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto">
            {jobsLoading && (
              <div className="py-8 text-center text-text-muted text-sm">Loading jobs...</div>
            )}
            {!jobsLoading && jobs.length === 0 && (
              <div className="py-8 text-center space-y-3">
                <p className="text-text-muted text-sm">No jobs found</p>
                <div className="space-y-2">
                  <Input
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="Enter job name manually"
                    className="h-12 rounded-xl border-2 border-border-custom focus:border-brand-blue text-center"
                  />
                  <Button
                    onClick={() => {
                      if (!jobName.trim()) {
                        toast.error("Enter a job name")
                        return
                      }
                      setPhase("TYPE")
                    }}
                    disabled={!jobName.trim()}
                    className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}
            {!jobsLoading && jobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => {
                  setJobName(job.name)
                  setJobNumber(job.number || "")
                  setPhase("TYPE")
                }}
                className="w-full p-4 rounded-xl border-2 border-border-custom bg-white text-left hover:border-brand-blue hover:bg-brand-blue/4 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/8">
                    <Briefcase className="h-5 w-5 text-navy" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy truncate">{job.name}</p>
                    <p className="text-xs text-text-muted truncate">
                      {[job.number, job.client].filter(Boolean).join(" · ") || "No details"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── TYPE SELECTION ── */}
      {phase === "TYPE" && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPhase("JOB")}
            className="text-text-muted -ml-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="text-center space-y-1 px-2">
            <h2 className="text-xl font-bold text-navy">What are you building?</h2>
            {jobName && <p className="text-sm font-medium text-navy">{jobName}</p>}
            {jobNumber && <p className="text-xs text-brand-blue">Job #{jobNumber}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {FAB_TYPES.map((ft) => {
              const Icon = ft.icon
              return (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => handleSelectType(ft.value)}
                  className="p-5 rounded-xl border-2 border-border-custom bg-white text-left hover:border-brand-blue hover:bg-brand-blue/4 transition-all duration-200 active:scale-[0.97]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/10">
                      <Icon className="h-5 w-5 text-brand-blue" />
                    </div>
                    <span className="font-bold text-navy text-base">{ft.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── TEMPLATE SELECTION ── */}
      {phase === "TEMPLATE" && fabType && fabType !== "RAMP" && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPhase("TYPE")}
            className="text-text-muted -ml-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="text-center space-y-1 px-2">
            <h2 className="text-xl font-bold text-navy">Select Template</h2>
            <p className="text-sm text-text-secondary">{typeLabel}</p>
          </div>

          {/* Job badge — matches door workflow pattern */}
          {(jobName || jobNumber) && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-navy/8 rounded-xl">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Job</span>
              {jobNumber && <span className="text-sm font-bold text-navy">#{jobNumber}</span>}
              {jobNumber && jobName && <span className="text-text-muted">·</span>}
              {jobName && <span className="text-sm font-medium text-navy">{jobName}</span>}
            </div>
          )}

          {templatesLoading ? (
            <div className="text-sm text-text-muted text-center py-8">Loading templates...</div>
          ) : (
            <>
              <div className="space-y-2">
                {filteredTemplates.map((t: Record<string, unknown>) => (
                  <button
                    key={t.id as string}
                    type="button"
                    onClick={() => handleSelectTemplate(t)}
                    className="w-full p-4 rounded-xl border-2 border-border-custom bg-white text-left hover:border-brand-blue hover:bg-brand-blue/4 transition-all duration-200 active:scale-[0.98]"
                  >
                    <p className="font-semibold text-navy">{t.name as string}</p>
                    {!!t.description && (
                      <p className="text-xs text-text-secondary mt-0.5">{String(t.description)}</p>
                    )}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleSelectTemplate(null)}
                className="w-full p-4 rounded-xl border-2 border-dashed border-border-custom text-center hover:border-brand-blue hover:bg-brand-blue/4 transition-all duration-200"
              >
                <span className="font-semibold text-text-secondary text-sm">Custom (No Template)</span>
                <p className="text-xs text-text-muted mt-0.5">Specify dimensions and materials manually</p>
              </button>
            </>
          )}
        </div>
      )}

      {/* ── SPECS ── */}
      {phase === "SPECS" && fabType && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (fabType === "RAMP" || filteredTemplates.length === 0) {
                setPhase("TYPE")
              } else {
                setPhase("TEMPLATE")
              }
            }}
            className="text-text-muted -ml-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="text-center space-y-1 px-2">
            <h2 className="text-xl font-bold text-navy">{typeLabel} Specs</h2>
          </div>

          {/* Job badge — matches door workflow pattern */}
          {(jobName || jobNumber) && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-navy/8 rounded-xl">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Job</span>
              {jobNumber && <span className="text-sm font-bold text-navy">#{jobNumber}</span>}
              {jobNumber && jobName && <span className="text-text-muted">·</span>}
              {jobName && <span className="text-sm font-medium text-navy">{jobName}</span>}
            </div>
          )}

          {/* Quantity */}
          <Card className="p-5 rounded-xl border-border-custom">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-navy">Quantity</span>
              <div className="flex items-center gap-0 rounded-xl border border-border-custom overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="h-11 w-11 flex items-center justify-center bg-white text-navy active:bg-surface-secondary disabled:opacity-30 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="h-11 w-12 flex items-center justify-center border-x border-border-custom bg-white">
                  <span className="text-[15px] font-bold text-navy tabular-nums">{quantity}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-11 w-11 flex items-center justify-center bg-white text-navy active:bg-surface-secondary transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>

          {/* Type-specific spec form */}
          {fabType === "RAMP" ? (
            <RampSpecForm specs={rampSpecs} onChange={setRampSpecs} />
          ) : (
            <PanelSpecForm specs={panelSpecs} onChange={setPanelSpecs} type={fabType} />
          )}

          <Button
            onClick={handleSpecsContinue}
            disabled={loadingRecipe}
            className="w-full h-14 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-base rounded-xl"
          >
            {loadingRecipe ? "Loading components..." : "Continue to Review"}
          </Button>
        </div>
      )}

      {/* ── REVIEW ── */}
      {phase === "REVIEW" && fabType && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPhase("SPECS")}
            className="text-text-muted -ml-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="text-center space-y-1 px-2">
            <h2 className="text-xl font-bold text-navy">Review {typeLabel}</h2>
          </div>

          {/* Job badge — matches door workflow pattern */}
          {(jobName || jobNumber) && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-navy/8 rounded-xl">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Job</span>
              {jobNumber && <span className="text-sm font-bold text-navy">#{jobNumber}</span>}
              {jobNumber && jobName && <span className="text-text-muted">·</span>}
              {jobName && <span className="text-sm font-medium text-navy">{jobName}</span>}
            </div>
          )}

          {/* Specs summary */}
          <Card className="p-5 rounded-xl border-border-custom space-y-2">
            <h3 className="font-semibold text-navy text-sm">Specifications</h3>
            {fabType === "RAMP" ? (
              <div className="space-y-1.5 text-sm">
                <SpecSummaryRow label="Width" value={rampSpecs.width ? `${rampSpecs.width}"` : "—"} />
                <SpecSummaryRow label="Length" value={rampSpecs.length ? `${rampSpecs.length}"` : "—"} />
                <SpecSummaryRow label="Height" value={rampSpecs.height ? `${rampSpecs.height}"` : "—"} />
                <SpecSummaryRow label="Bottom Lip" value={rampSpecs.bottomLip ? `${rampSpecs.bottomLip}"` : "—"} />
                <SpecSummaryRow label="Top Lip" value={rampSpecs.topLip ? `${rampSpecs.topLip}"` : "—"} />
                <SpecSummaryRow label="Insulation" value={rampSpecs.insulation || "—"} />
                <SpecSummaryRow label="Diamond Plate" value={rampSpecs.diamondPlateThickness ? `${rampSpecs.diamondPlateThickness}"` : "—"} />
              </div>
            ) : (
              <div className="space-y-1.5 text-sm">
                <SpecSummaryRow label="Width" value={panelSpecs.width ? formatDimInches(panelSpecs.width) : "—"} />
                <SpecSummaryRow label="Length" value={panelSpecs.length ? formatDimInches(panelSpecs.length) : "—"} />
                <SpecSummaryRow label="Insulation" value={panelSpecs.insulation || "—"} />
                <SpecSummaryRow label="Thickness" value={panelSpecs.insulationThickness ? `${panelSpecs.insulationThickness}"` : "—"} />
                <SpecSummaryRow label="Side 1" value={panelSpecs.side1Material || "—"} />
                <SpecSummaryRow label="Side 2" value={panelSpecs.side2Material || "—"} />
              </div>
            )}
            {quantity > 1 && (
              <p className="text-xs text-brand-blue font-medium pt-1">Quantity: {quantity}</p>
            )}
          </Card>

          {/* Components */}
          <Card className="p-5 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy text-sm">
              Components ({components.length})
            </h3>
            <ComponentList
              components={components}
              onAdd={handleAddComponent}
              onRemove={handleRemoveComponent}
              onQtyChange={handleComponentQtyChange}
              batchSize={quantity}
            />
          </Card>

          {/* Notes */}
          <Card className="p-5 rounded-xl border-border-custom space-y-2">
            <h3 className="font-semibold text-navy text-sm">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="w-full rounded-xl border border-border-custom p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </Card>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={createAssembly.isPending || components.length === 0}
            className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl shadow-[0_2px_8px_rgba(232,121,43,0.25)] transition-all"
          >
            <Factory className="h-5 w-5 mr-2" />
            {createAssembly.isPending
              ? "Creating..."
              : `Add to Fabrication Queue (${components.length} components)`}
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Helpers ──

function SpecSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border-custom/30 last:border-0">
      <span className="text-text-secondary">{label}</span>
      <span className="font-semibold text-navy">{value}</span>
    </div>
  )
}

function formatDimInches(inches: string): string {
  const val = parseFloat(inches)
  if (!val) return inches
  const ft = Math.floor(val / 12)
  const rem = val % 12
  if (ft === 0) return `${rem}"`
  if (rem === 0) return `${ft}'`
  return `${ft}'${rem}"`
}
