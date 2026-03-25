"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useCreateAssembly } from "@/hooks/use-assemblies"
import { useJobs } from "@/hooks/use-jobs"
import { DoorBuilder } from "./door-builder"
import { DoorConfirmation } from "./door-confirmation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StepProgress } from "@/components/layout/step-progress"
import { toast } from "sonner"
import { useCelebration } from "@/hooks/use-celebration"
import {
  Thermometer,
  Snowflake,
  DoorOpen,
  ArrowLeftRight,
  Search,
  Briefcase,
  ChevronLeft,
  Wrench,
} from "lucide-react"
import type { DoorSpecs } from "@/lib/door-specs"
import {
  getDefaultSpecs,
  STANDARD_DOOR_CONFIGS,
  type DoorTypeKey,
  type StandardDoorConfig,
} from "@/lib/door-specs"
import { matchDoorRecipe, matchPlugDoorRecipe } from "@/lib/door-recipes"
import type { ParseResult, ReceivingParseResult, CatalogMatch } from "@/lib/ai/types"

type FlowPhase = "JOB" | "TYPE" | "SIZE" | "CONFIRM" | "CUSTOM_BUILDER"

const FLOW_STEPS = ["Job", "Type", "Size", "Confirm"]
const PHASE_INDEX: Record<FlowPhase, number> = {
  JOB: 0,
  TYPE: 1,
  SIZE: 2,
  CONFIRM: 3,
  CUSTOM_BUILDER: 2,
}

interface ComponentItem {
  productId: string
  productName: string
  unitOfMeasure: string
  qtyUsed: number
  currentQty: number
}

// Door type cards config
const DOOR_TYPES: {
  key: DoorTypeKey
  label: string
  subtitle: string
  icon1: typeof Thermometer
  icon2: typeof DoorOpen
  bgClass: string
  iconClass: string
}[] = [
  {
    key: "COOLER_SWING",
    label: "Cooler Swing",
    subtitle: "Hinged cooler door",
    icon1: Thermometer,
    icon2: DoorOpen,
    bgClass: "bg-surface-secondary",
    iconClass: "text-text-secondary",
  },
  {
    key: "FREEZER_SWING",
    label: "Freezer Swing",
    subtitle: "Hinged freezer door",
    icon1: Snowflake,
    icon2: DoorOpen,
    bgClass: "bg-brand-blue/10",
    iconClass: "text-brand-blue",
  },
  {
    key: "COOLER_SLIDER",
    label: "Cooler Slider",
    subtitle: "Sliding cooler door",
    icon1: Thermometer,
    icon2: ArrowLeftRight,
    bgClass: "bg-surface-secondary",
    iconClass: "text-text-secondary",
  },
  {
    key: "FREEZER_SLIDER",
    label: "Freezer Slider",
    subtitle: "Sliding freezer door",
    icon1: Snowflake,
    icon2: ArrowLeftRight,
    bgClass: "bg-brand-blue/10",
    iconClass: "text-brand-blue",
  },
]

export function DoorCreationFlow() {
  const router = useRouter()
  const { celebrate } = useCelebration()
  const createAssembly = useCreateAssembly()

  // Flow state
  const [phase, setPhase] = useState<FlowPhase>("JOB")
  const [specs, setSpecs] = useState<Partial<DoorSpecs>>(getDefaultSpecs())
  const [selectedType, setSelectedType] = useState<DoorTypeKey | null>(null)

  // Job
  const [jobSearch, setJobSearch] = useState("")
  const [jobName, setJobName] = useState("")
  const [jobNumber, setJobNumber] = useState("")
  const { data: jobsData, isLoading: jobsLoading } = useJobs(jobSearch || undefined)
  const jobs = (jobsData?.data || []) as Array<{ id: string; name: string; number?: string; client?: string }>

  // Components & submission
  const [notes, setNotes] = useState("")
  const [components, setComponents] = useState<ComponentItem[]>([])
  const [loadingRecipe, setLoadingRecipe] = useState(false)

  // ── Recipe loading (shared between size select and custom builder) ──

  async function loadRecipeComponents(doorSpecs: Partial<DoorSpecs>): Promise<ComponentItem[]> {
    // Try standard recipe first, then plug recipe for frameless freezer doors
    let recipe = matchDoorRecipe(doorSpecs)
    if (!recipe && !doorSpecs.frameType && doorSpecs.temperatureType === "FREEZER") {
      recipe = matchPlugDoorRecipe(doorSpecs)
    }
    if (!recipe || recipe.components.length === 0) return []

    try {
      const names = recipe.components.map((c) => c.name).join(",")
      const res = await fetch(`/api/products/bulk-lookup?names=${encodeURIComponent(names)}`)
      if (!res.ok) return []

      const json = await res.json()
      const lookupResults = json.data as Array<{
        requestedName: string
        product: { id: string; name: string; unitOfMeasure: string; currentQty: number } | null
      }>

      const autoComponents: ComponentItem[] = []
      for (const recipeComp of recipe.components) {
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

  // ── Size selection handler ──

  async function handleSizeSelect(config: StandardDoorConfig) {
    setLoadingRecipe(true)
    const mergedSpecs = { ...config.specs, jobName: jobName || undefined, jobNumber: jobNumber || undefined }
    setSpecs(mergedSpecs)

    const autoComponents = await loadRecipeComponents(mergedSpecs)
    if (autoComponents.length > 0) {
      setComponents(autoComponents)
      toast.success(`Auto-added ${autoComponents.length} components`)
    }

    setLoadingRecipe(false)
    setPhase("CONFIRM")
  }

  // ── Custom builder completion ──

  async function handleBuilderComplete(builderSpecs: Partial<DoorSpecs>) {
    setLoadingRecipe(true)
    const mergedSpecs = { ...specs, ...builderSpecs, jobName: jobName || undefined, jobNumber: jobNumber || undefined }
    setSpecs(mergedSpecs)

    const autoComponents = await loadRecipeComponents(mergedSpecs)
    if (autoComponents.length > 0) {
      setComponents(autoComponents)
      toast.success(`Auto-added ${autoComponents.length} components`)
    }

    setLoadingRecipe(false)
    setPhase("CONFIRM")
  }

  // ── Spec & component handlers ──

  function handleSpecChange(field: string, value: unknown) {
    setSpecs((prev) => ({ ...prev, [field]: value }))
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
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, qtyUsed: qty } : c)))
  }

  // ── Submit ──

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
        templateId: null,
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
      toast.error(err instanceof Error ? err.message : "Failed to create door")
    }
  }

  // ── Back navigation ──

  function handleConfirmBack() {
    if (selectedType) setPhase("SIZE")
    else setPhase("TYPE")
  }

  // ── Step click navigation ──

  function handleStepClick(stepIndex: number) {
    const current = PHASE_INDEX[phase]
    if (stepIndex >= current) return
    if (stepIndex === 0) setPhase("JOB")
    else if (stepIndex === 1) setPhase("TYPE")
    else if (stepIndex === 2) {
      if (selectedType) setPhase("SIZE")
    }
  }

  const currentStep = PHASE_INDEX[phase]

  return (
    <div className="space-y-4">
      {/* Step progress — hide during custom builder (it has its own) */}
      {phase !== "CUSTOM_BUILDER" && (
        <StepProgress
          steps={FLOW_STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />
      )}

      {/* ── JOB SELECTION ── */}
      {phase === "JOB" && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className="text-center space-y-1 px-2">
            <h2 className="text-xl font-bold text-navy">Select Job</h2>
            <p className="text-sm text-text-secondary">Which job is this door for?</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              placeholder="Search jobs..."
              className="pl-10 h-12 rounded-xl border-2 border-border-custom focus:border-brand-blue"
            />
          </div>

          {/* Job list */}
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
            <h2 className="text-xl font-bold text-navy">Door Type</h2>
            <p className="text-sm text-text-secondary">
              {jobName && <span className="font-medium text-navy">{jobName}</span>}
            </p>
          </div>

          {/* 2×2 grid */}
          <div className="grid grid-cols-2 gap-3">
            {DOOR_TYPES.map((dt) => {
              const Icon1 = dt.icon1
              const Icon2 = dt.icon2
              return (
                <button
                  key={dt.key}
                  type="button"
                  onClick={() => {
                    setSelectedType(dt.key)
                    // If no standard sizes for this type, go straight to custom
                    if (STANDARD_DOOR_CONFIGS[dt.key].length === 0) {
                      // Set base specs for the type so builder has context
                      const isSlider = dt.key.includes("SLIDER")
                      const isFreezer = dt.key.includes("FREEZER")
                      setSpecs({
                        ...getDefaultSpecs(),
                        openingType: isSlider ? "SLIDE" : "HINGE",
                        temperatureType: isFreezer ? "FREEZER" : "COOLER",
                        doorCategory: isSlider ? "SLIDING" : isFreezer ? "HINGED_FREEZER" : "HINGED_COOLER",
                      })
                      setPhase("CUSTOM_BUILDER")
                      return
                    }
                    setPhase("SIZE")
                  }}
                  className={`p-5 rounded-xl border-2 border-border-custom ${dt.bgClass} text-left hover:border-brand-blue transition-all duration-200 active:scale-[0.97]`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon1 className={`h-5 w-5 ${dt.iconClass}`} />
                    <Icon2 className={`h-5 w-5 ${dt.iconClass} opacity-60`} />
                  </div>
                  <p className="font-bold text-navy text-base">{dt.label}</p>
                  <p className="text-xs text-text-muted mt-0.5">{dt.subtitle}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SIZE SELECTION ── */}
      {phase === "SIZE" && selectedType && (
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
            <h2 className="text-xl font-bold text-navy">Standard Size</h2>
            <p className="text-sm text-text-secondary">
              {DOOR_TYPES.find((d) => d.key === selectedType)?.label}
              {jobName && <span className="text-text-muted"> · {jobName}</span>}
            </p>
          </div>

          {/* Size cards */}
          <div className="space-y-2">
            {STANDARD_DOOR_CONFIGS[selectedType].map((config) => (
              <button
                key={config.id}
                type="button"
                onClick={() => handleSizeSelect(config)}
                disabled={loadingRecipe}
                className="w-full p-4 rounded-xl border-2 border-border-custom bg-white text-left hover:border-brand-blue hover:bg-brand-blue/4 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-navy">{config.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {config.widthInClear}&quot; × {config.heightInClear}&quot; clear
                    </p>
                  </div>
                  <p className="text-xs text-text-secondary max-w-[140px] text-right leading-relaxed">
                    {config.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Custom size option */}
          <button
            type="button"
            onClick={() => {
              const isSlider = selectedType.includes("SLIDER")
              const isFreezer = selectedType.includes("FREEZER")
              setSpecs({
                ...getDefaultSpecs(),
                openingType: isSlider ? "SLIDE" : "HINGE",
                temperatureType: isFreezer ? "FREEZER" : "COOLER",
                doorCategory: isSlider ? "SLIDING" : isFreezer ? "HINGED_FREEZER" : "HINGED_COOLER",
              })
              setPhase("CUSTOM_BUILDER")
            }}
            className="w-full p-4 rounded-xl border-2 border-dashed border-border-custom text-center hover:border-brand-blue hover:bg-brand-blue/4 transition-all duration-200"
          >
            <div className="flex items-center justify-center gap-2">
              <Wrench className="h-4 w-4 text-text-muted" />
              <span className="font-semibold text-text-secondary text-sm">Custom Size</span>
            </div>
            <p className="text-xs text-text-muted mt-1">Non-standard dimensions or specs</p>
          </button>

          {loadingRecipe && (
            <div className="text-center py-4 text-sm text-text-muted animate-pulse">
              Loading components...
            </div>
          )}
        </div>
      )}

      {/* ── CUSTOM BUILDER (fallback) ── */}
      {phase === "CUSTOM_BUILDER" && (
        <DoorBuilder
          onComplete={handleBuilderComplete}
          onBack={() => {
            if (selectedType && STANDARD_DOOR_CONFIGS[selectedType].length > 0) {
              setPhase("SIZE")
            } else {
              setPhase("TYPE")
            }
          }}
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
          jobNumber={jobNumber}
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
