"use client"

import { useState } from "react"
import type { DoorSpecs, Cutout, CutoutSide, DoorCategory, InsulationType, WindowSize, FinishType } from "@/lib/door-specs"
import { getStandardHardware, calculateHeaterCable } from "@/lib/door-specs"
import { InterviewStep, ChoiceButton, DimensionInput } from "./interview-step"
import { TapeMeasureInput, TapeMeasureTrigger } from "./tape-measure-input"
import { DoorPreview } from "./door-preview"
import { DoorDiagramContextual } from "./door-diagram-contextual"
import { StepProgress } from "@/components/layout/step-progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"

type BuilderStep =
  | "TYPE"
  // Swing branch — dimensions
  | "SWING_WIDTH"
  | "SWING_HEIGHT"
  | "SWING_JAMB"
  | "SWING_FRAME"
  | "SWING_FRAME_CUSTOM"
  | "SWING_CUTOUTS"
  | "SWING_CUTOUT_DETAIL"
  | "SWING_SILL"
  | "SWING_SILL_HEIGHT"
  | "SWING_INSULATION"
  // Swing branch — features
  | "SWING_TEMP"
  | "SWING_WINDOW"
  | "SWING_HINGE"
  | "SWING_HARDWARE"
  | "SWING_HARDWARE_CUSTOM"
  | "SWING_GASKET"
  | "SWING_FINISH"
  | "SWING_EXTRAS"
  // Slider branch
  | "SLIDER_TEMP"
  | "SLIDER_SIDE"
  | "SLIDER_WIDTH"
  | "SLIDER_HEIGHT"
  | "SLIDER_FINISH"
  // Done
  | "DONE"

interface DoorBuilderProps {
  onComplete: (specs: Partial<DoorSpecs>) => void
  onBack: () => void
}

const STEP_GROUPS: Record<string, number> = {
  TYPE: 0,
  SWING_WIDTH: 1, SWING_HEIGHT: 1, SWING_JAMB: 1, SWING_FRAME: 1, SWING_FRAME_CUSTOM: 1,
  SWING_CUTOUTS: 1, SWING_CUTOUT_DETAIL: 1, SWING_SILL: 1, SWING_SILL_HEIGHT: 1,
  SWING_INSULATION: 1,
  SWING_TEMP: 2, SWING_WINDOW: 2, SWING_HINGE: 2, SWING_HARDWARE: 2, SWING_HARDWARE_CUSTOM: 2,
  SWING_GASKET: 2, SWING_FINISH: 2, SWING_EXTRAS: 2,
  SLIDER_TEMP: 1, SLIDER_SIDE: 1, SLIDER_WIDTH: 1, SLIDER_HEIGHT: 1, SLIDER_FINISH: 1,
  DONE: 3,
}

const PROGRESS_LABELS = ["Type", "Dimensions", "Features", "Review"]

// Standard hardware options for dropdowns
const HINGE_OPTIONS = [
  { label: "DENT D690", value: "DENT|D690" },
  { label: "DENT D690CS", value: "DENT|D690CS" },
  { label: "Kason K1277 Cam-lift", value: "Kason|K1277 Cam-lift" },
  { label: "Kason K1248 Spring", value: "Kason|K1248" },
  { label: "Kason K1245", value: "Kason|K1245" },
]

const LATCH_OPTIONS = [
  { label: "DENT D90", value: "DENT|D90" },
  { label: "Kason K56 (Body Chrome)", value: "Kason|K56" },
  { label: "Kason K55 Complete", value: "Kason|K55 Complete" },
]

const CLOSER_OPTIONS = [
  { label: "DENT D276", value: "DENT D276" },
  { label: "Kason K1094", value: "Kason K1094" },
  { label: "None", value: "" },
]

const INSIDE_RELEASE_OPTIONS = [
  { label: "Kason K481 Safety Glow", value: "K481 Safety Glow" },
  { label: "Glow Push Panel", value: "Glow Push Panel" },
  { label: "None", value: "" },
]

export function DoorBuilder({ onComplete, onBack }: DoorBuilderProps) {
  const [step, setStep] = useState<BuilderStep>("TYPE")
  const [specs, setSpecs] = useState<Partial<DoorSpecs>>({
    label: true,
    panelInsulated: true,
    weatherShield: false,
    thresholdPlate: false,
    quantity: 1,
  })

  // Temp state for dimension inputs
  const [inputValue, setInputValue] = useState("")
  const [cutouts, setCutouts] = useState<Cutout[]>([])
  const [frameLHS, setFrameLHS] = useState("")
  const [frameRHS, setFrameRHS] = useState("")
  const [frameTop, setFrameTop] = useState("")

  // Cutout tape measure picker state: { cutoutIndex, field }
  const [cutoutPicker, setCutoutPicker] = useState<{ index: number; field: "floorToBottom" | "floorToTop" | "frameWidth" } | null>(null)

  // Hardware dropdown selections
  const [selectedHinge, setSelectedHinge] = useState("")
  const [selectedLatch, setSelectedLatch] = useState("")
  const [selectedCloser, setSelectedCloser] = useState("")
  const [selectedRelease, setSelectedRelease] = useState("")

  // Step history for back navigation
  const [history, setHistory] = useState<BuilderStep[]>([])

  // Map steps to their corresponding spec field so we can restore values on back nav
  const STEP_SPEC_FIELD: Partial<Record<BuilderStep, keyof DoorSpecs>> = {
    SWING_WIDTH: "widthInClear",
    SWING_HEIGHT: "heightInClear",
    SWING_JAMB: "jambDepth",
    SWING_SILL_HEIGHT: "sillHeight",
    SLIDER_WIDTH: "widthInClear",
    SLIDER_HEIGHT: "heightInClear",
  }

  function restoreInputForStep(targetStep: BuilderStep) {
    const field = STEP_SPEC_FIELD[targetStep]
    if (field && specs[field] != null && specs[field] !== "") {
      setInputValue(String(specs[field]))
    } else {
      setInputValue("")
    }

    // Restore cutouts from specs when going back to cutout detail
    if (targetStep === "SWING_CUTOUT_DETAIL" && specs.cutouts && specs.cutouts.length > 0) {
      setCutouts([...specs.cutouts])
    }

    // Restore custom frame dimensions
    if (targetStep === "SWING_FRAME_CUSTOM") {
      setFrameLHS(specs.frameLHS || "")
      setFrameRHS(specs.frameRHS || "")
      setFrameTop(specs.frameTop || "")
    }

    // Restore hardware selections
    if (targetStep === "SWING_HARDWARE_CUSTOM") {
      if (specs.hingeMfrName && specs.hingeModel) {
        setSelectedHinge(`${specs.hingeMfrName}|${specs.hingeModel}`)
      }
      if (specs.latchMfrName && specs.latchModel) {
        setSelectedLatch(`${specs.latchMfrName}|${specs.latchModel}`)
      }
      if (specs.closerModel) setSelectedCloser(specs.closerModel)
      if (specs.insideRelease) setSelectedRelease(specs.insideRelease)
    }
  }

  function goTo(next: BuilderStep) {
    setHistory((h) => [...h, step])
    restoreInputForStep(next)
    setStep(next)
  }

  function goBack() {
    if (history.length === 0) {
      onBack()
      return
    }
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    restoreInputForStep(prev)
    setStep(prev)
  }

  function updateSpecs(partial: Partial<DoorSpecs>) {
    setSpecs((s) => ({ ...s, ...partial }))
  }

  function finalize(finalPartial?: Partial<DoorSpecs>) {
    const final = { ...specs, ...finalPartial }

    // Auto-calculate heater cable for freezer
    if (final.temperatureType === "FREEZER") {
      const cable = calculateHeaterCable(final)
      if (cable) final.heaterSize = cable
    }

    onComplete(final)
  }

  const currentGroup = STEP_GROUPS[step] ?? 0

  function navigateToGroup(targetGroup: number) {
    if (targetGroup >= currentGroup) return
    let newHistory = [...history]
    let targetStep = step
    while (newHistory.length > 0) {
      const prev = newHistory[newHistory.length - 1]
      const prevGroup = STEP_GROUPS[prev] ?? 0
      if (prevGroup <= targetGroup) {
        targetStep = prev
        break
      }
      newHistory = newHistory.slice(0, -1)
    }
    if (newHistory.length === 0 && targetGroup === 0) {
      targetStep = "TYPE" as BuilderStep
    }
    setHistory(newHistory)
    restoreInputForStep(targetStep)
    setStep(targetStep)
  }

  return (
    <div className="space-y-4">
      <StepProgress
        steps={PROGRESS_LABELS}
        currentStep={currentGroup}
        onStepClick={(stepIndex) => navigateToGroup(stepIndex)}
      />

      {/* Contextual door diagram — shows step-specific measurement visualization */}
      {step !== "TYPE" && (
        <div className="flex justify-center py-1 animate-fade-in">
          <DoorDiagramContextual step={step} specs={specs} className="max-w-[280px] w-full" />
        </div>
      )}

      {/* Q1: Swing or Slider */}
      {step === "TYPE" && (
        <InterviewStep
          question="What type of door?"
          onBack={onBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="Swing Door (Hinged)"
              onClick={() => {
                updateSpecs({ openingType: "HINGE" })
                goTo("SWING_WIDTH")
              }}
            />
            <ChoiceButton
              label="Sliding Door"
              onClick={() => {
                updateSpecs({
                  openingType: "SLIDE",
                  doorCategory: "SLIDING",
                })
                goTo("SLIDER_TEMP")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {/* ── SWING BRANCH: DIMENSIONS ── */}

      {step === "SWING_WIDTH" && (
        <InterviewStep
          question="Clear Opening Width?"
          description="Width of the door opening (in inches)"
          onBack={goBack}
        >
          <DimensionInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => {
              updateSpecs({ widthInClear: inputValue.trim() })
              goTo("SWING_HEIGHT")
            }}
            placeholder='e.g. 36"'
          />
        </InterviewStep>
      )}

      {step === "SWING_HEIGHT" && (
        <InterviewStep
          question="Clear Opening Height?"
          description="Height of the door opening (in inches)"
          onBack={goBack}
        >
          <DimensionInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => {
              updateSpecs({ heightInClear: inputValue.trim() })
              goTo("SWING_JAMB")
            }}
            placeholder='e.g. 77-1/4"'
          />
        </InterviewStep>
      )}

      {step === "SWING_JAMB" && (
        <InterviewStep
          question="Jamb Depth?"
          description="Depth of the door frame (in inches)"
          onBack={goBack}
        >
          <DimensionInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => {
              updateSpecs({ jambDepth: inputValue.trim() })
              goTo("SWING_FRAME")
            }}
            placeholder='e.g. 4"'
          />
        </InterviewStep>
      )}

      {step === "SWING_FRAME" && (
        <InterviewStep
          question="Frame Type?"
          description="Select the frame style for this door"
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="Full Frame"
              onClick={() => {
                updateSpecs({ frameCustom: false, frameType: "FULL_FRAME" })
                goTo("SWING_CUTOUTS")
              }}
            />
            <ChoiceButton
              label="Face Frame"
              onClick={() => {
                updateSpecs({ frameCustom: false, frameType: "FACE_FRAME" })
                goTo("SWING_CUTOUTS")
              }}
            />
            <ChoiceButton
              label="Bally Type"
              onClick={() => {
                updateSpecs({ frameCustom: false, frameType: "BALLY_TYPE" })
                goTo("SWING_CUTOUTS")
              }}
            />
            <ChoiceButton
              label="Custom Dimensions"
              onClick={() => {
                updateSpecs({ frameCustom: true })
                setFrameLHS("")
                setFrameRHS("")
                setFrameTop("")
                goTo("SWING_FRAME_CUSTOM")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {step === "SWING_FRAME_CUSTOM" && (
        <InterviewStep
          question="Custom Frame Dimensions"
          description="Enter the LHS, RHS, and Top jamb dimensions"
          onBack={goBack}
        >
          <div className="space-y-3">
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Left Side (LHS)</label>
              <input
                type="text"
                inputMode="decimal"
                value={frameLHS}
                onChange={(e) => setFrameLHS(e.target.value)}
                placeholder='e.g. 4"'
                className="w-full h-12 text-center text-lg font-bold rounded-xl border-2 border-border-custom focus:border-brand-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Right Side (RHS)</label>
              <input
                type="text"
                inputMode="decimal"
                value={frameRHS}
                onChange={(e) => setFrameRHS(e.target.value)}
                placeholder='e.g. 4"'
                className="w-full h-12 text-center text-lg font-bold rounded-xl border-2 border-border-custom focus:border-brand-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Top (Header)</label>
              <input
                type="text"
                inputMode="decimal"
                value={frameTop}
                onChange={(e) => setFrameTop(e.target.value)}
                placeholder='e.g. 4"'
                className="w-full h-12 text-center text-lg font-bold rounded-xl border-2 border-border-custom focus:border-brand-blue focus:outline-none"
              />
            </div>
            <Button
              onClick={() => {
                updateSpecs({
                  frameCustom: true,
                  frameLHS: frameLHS.trim() || undefined,
                  frameRHS: frameRHS.trim() || undefined,
                  frameTop: frameTop.trim() || undefined,
                })
                goTo("SWING_CUTOUTS")
              }}
              disabled={!frameLHS.trim() && !frameRHS.trim() && !frameTop.trim()}
              className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl"
            >
              Next
            </Button>
          </div>
        </InterviewStep>
      )}

      {step === "SWING_CUTOUTS" && (
        <InterviewStep
          question="Any Cutouts?"
          description="Cutouts along the door frame to accommodate existing fixtures (thermometers, light switches, etc.)"
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="No Cutouts"
              onClick={() => {
                updateSpecs({ cutouts: undefined })
                goTo("SWING_SILL")
              }}
            />
            <ChoiceButton
              label="Yes — Add Cutouts"
              onClick={() => {
                setCutouts([{ side: "LEFT", floorToBottom: "", floorToTop: "", frameWidth: "" }])
                goTo("SWING_CUTOUT_DETAIL")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {step === "SWING_CUTOUT_DETAIL" && (
        <InterviewStep
          question={`Cutout Details (${cutouts.length})`}
          description="Measurements from floor, width from frame edge"
          onBack={goBack}
        >
          <div className="space-y-4">
            {cutouts.map((cutout, i) => (
              <div key={i} className="p-3 bg-surface-secondary rounded-xl space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-navy">Cutout {i + 1}</span>
                  {cutouts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCutouts((c) => c.filter((_, idx) => idx !== i))}
                      className="h-6 w-6 text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Side selector — segmented pills */}
                <div className="flex gap-1 bg-white rounded-xl p-0.5 border border-border-custom">
                  {(["LEFT", "RIGHT", "TOP"] as CutoutSide[]).map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => {
                        const updated = [...cutouts]
                        updated[i] = { ...updated[i], side }
                        setCutouts(updated)
                      }}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                        cutout.side === side
                          ? "bg-brand-blue text-white shadow-brand"
                          : "text-text-muted hover:text-navy"
                      }`}
                    >
                      {side === "LEFT" ? "Left" : side === "RIGHT" ? "Right" : "Top"}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCutoutPicker({ index: i, field: "floorToBottom" })}
                    className="text-left p-2 rounded-xl border border-border-custom bg-white hover:border-brand-blue/50 transition-colors min-h-[52px]"
                  >
                    <p className="text-[10px] text-text-muted">Floor→Bottom</p>
                    <p className="text-sm font-bold text-navy tabular-nums">
                      {cutout.floorToBottom ? `${cutout.floorToBottom}"` : <span className="text-text-muted font-normal">Tap</span>}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCutoutPicker({ index: i, field: "floorToTop" })}
                    className="text-left p-2 rounded-xl border border-border-custom bg-white hover:border-brand-blue/50 transition-colors min-h-[52px]"
                  >
                    <p className="text-[10px] text-text-muted">Floor→Top</p>
                    <p className="text-sm font-bold text-navy tabular-nums">
                      {cutout.floorToTop ? `${cutout.floorToTop}"` : <span className="text-text-muted font-normal">Tap</span>}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCutoutPicker({ index: i, field: "frameWidth" })}
                    className="text-left p-2 rounded-xl border border-border-custom bg-white hover:border-brand-blue/50 transition-colors min-h-[52px]"
                  >
                    <p className="text-[10px] text-text-muted">Width</p>
                    <p className="text-sm font-bold text-navy tabular-nums">
                      {cutout.frameWidth ? `${cutout.frameWidth}"` : <span className="text-text-muted font-normal">Tap</span>}
                    </p>
                  </button>
                </div>

                {/* Cutout tape measure picker */}
                {cutoutPicker && cutoutPicker.index === i && (
                  <TapeMeasureInput
                    key={`cutout-${i}-${cutoutPicker.field}`}
                    value={cutout[cutoutPicker.field]}
                    onChange={(v) => {
                      const updated = [...cutouts]
                      updated[i] = { ...updated[i], [cutoutPicker.field]: v }
                      setCutouts(updated)
                    }}
                    label={
                      cutoutPicker.field === "floorToBottom" ? "Floor to Bottom" :
                      cutoutPicker.field === "floorToTop" ? "Floor to Top" : "Width from Edge"
                    }
                    max={96}
                    open={true}
                    onOpenChange={(open) => { if (!open) setCutoutPicker(null) }}
                  />
                )}
              </div>
            ))}

            <Button
              variant="outline"
              onClick={() =>
                setCutouts((c) => [...c, { side: "LEFT", floorToBottom: "", floorToTop: "", frameWidth: "" }])
              }
              className="w-full rounded-xl border-dashed"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Another Cutout
            </Button>

            <Button
              onClick={() => {
                const validCutouts = cutouts.filter(
                  (c) => c.floorToBottom.trim() || c.floorToTop.trim() || c.frameWidth.trim()
                )
                updateSpecs({ cutouts: validCutouts.length > 0 ? validCutouts : undefined })
                goTo("SWING_SILL")
              }}
              className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl"
            >
              Next
            </Button>
          </div>
        </InterviewStep>
      )}

      {step === "SWING_SILL" && (
        <InterviewStep
          question="High Sill?"
          description="Does the door have a raised sill at the bottom?"
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="No — Standard (Wiper)"
              onClick={() => {
                updateSpecs({ highSill: false, wiper: true, sillHeight: undefined })
                goTo("SWING_INSULATION")
              }}
            />
            <ChoiceButton
              label="Yes — High Sill"
              onClick={() => {
                updateSpecs({ highSill: true, wiper: false })
                goTo("SWING_SILL_HEIGHT")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {step === "SWING_SILL_HEIGHT" && (
        <InterviewStep
          question="Sill Height?"
          description="Floor to bottom of clear opening"
          onBack={goBack}
        >
          <DimensionInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => {
              updateSpecs({ sillHeight: inputValue.trim() })
              goTo("SWING_INSULATION")
            }}
            placeholder='e.g. 6"'
          />
        </InterviewStep>
      )}

      {/* ── NEW: Insulation Step ── */}
      {step === "SWING_INSULATION" && (
        <InterviewStep
          question="Insulation Type?"
          description="Select the insulation material for the door panel"
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="IMP — Insulated Metal Panel"
              onClick={() => {
                updateSpecs({ insulationType: "IMP" as InsulationType })
                goTo("SWING_TEMP")
              }}
            />
            <ChoiceButton
              label="EPS — Expanded Polystyrene"
              onClick={() => {
                updateSpecs({ insulationType: "EPS" as InsulationType })
                goTo("SWING_TEMP")
              }}
            />
            <ChoiceButton
              label="PIR — Polyisocyanurate"
              onClick={() => {
                updateSpecs({ insulationType: "PIR" as InsulationType })
                goTo("SWING_TEMP")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {/* ── SWING BRANCH: FEATURES ── */}

      {step === "SWING_TEMP" && (
        <InterviewStep
          question="Cooler or Freezer?"
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="Cooler"
              onClick={() => {
                updateSpecs({
                  temperatureType: "COOLER",
                  doorCategory: "HINGED_COOLER",
                })
                goTo("SWING_WINDOW")
              }}
            />
            <ChoiceButton
              label="Freezer"
              onClick={() => {
                updateSpecs({
                  temperatureType: "FREEZER",
                  doorCategory: "HINGED_FREEZER",
                })
                goTo("SWING_WINDOW")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {/* ── NEW: Window Step ── */}
      {step === "SWING_WINDOW" && (
        <InterviewStep
          question="View Window?"
          description={specs.temperatureType === "FREEZER"
            ? "Freezer doors require heated windows"
            : "Cooler doors use non-heated windows"}
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="No Window"
              onClick={() => {
                updateSpecs({ windowSize: undefined, windowHeated: undefined })
                goTo("SWING_HINGE")
              }}
            />
            <ChoiceButton
              label='14" x 14" (Standard)'
              onClick={() => {
                updateSpecs({
                  windowSize: "14x14" as WindowSize,
                  windowHeated: specs.temperatureType === "FREEZER",
                })
                goTo("SWING_HINGE")
              }}
            />
            <ChoiceButton
              label='14" x 24"'
              onClick={() => {
                updateSpecs({
                  windowSize: "14x24" as WindowSize,
                  windowHeated: specs.temperatureType === "FREEZER",
                })
                goTo("SWING_HINGE")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {step === "SWING_HINGE" && (
        <InterviewStep
          question="Hinge Side?"
          description="Which side are the hinges on (as viewed from outside)?"
          onBack={goBack}
        >
          <div className="grid grid-cols-2 gap-3">
            <ChoiceButton
              label="Right"
              onClick={() => {
                updateSpecs({ hingeSide: "RIGHT" })
                goTo("SWING_HARDWARE")
              }}
            />
            <ChoiceButton
              label="Left"
              onClick={() => {
                updateSpecs({ hingeSide: "LEFT" })
                goTo("SWING_HARDWARE")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {step === "SWING_HARDWARE" && (
        <InterviewStep
          question="Standard Hardware?"
          description={getHardwareDescription(specs.doorCategory, specs.widthInClear)}
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="Yes — Use Standard"
              onClick={() => {
                const hw = getStandardHardware(
                  specs.doorCategory,
                  specs.widthInClear,
                  specs.isExterior,
                )
                updateSpecs({
                  hingeMfrName: hw.hingeMfrName,
                  hingeModel: hw.hingeModel,
                  latchMfrName: hw.latchMfrName,
                  latchModel: hw.latchModel,
                  closerModel: hw.closerModel,
                })
                goTo("SWING_GASKET")
              }}
            />
            <ChoiceButton
              label="No — Specify Custom"
              onClick={() => {
                setSelectedHinge("")
                setSelectedLatch("")
                setSelectedCloser("")
                setSelectedRelease("")
                goTo("SWING_HARDWARE_CUSTOM")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {step === "SWING_HARDWARE_CUSTOM" && (
        <InterviewStep
          question="Select Hardware"
          description="Choose hinge, latch, closer, and inside release"
          onBack={goBack}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Hinge *</label>
              <select
                value={selectedHinge}
                onChange={(e) => setSelectedHinge(e.target.value)}
                className="w-full h-12 rounded-xl border-2 border-border-custom px-3 text-base font-medium focus:border-brand-blue focus:outline-none bg-white"
              >
                <option value="">Select hinge...</option>
                {HINGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Latch *</label>
              <select
                value={selectedLatch}
                onChange={(e) => setSelectedLatch(e.target.value)}
                className="w-full h-12 rounded-xl border-2 border-border-custom px-3 text-base font-medium focus:border-brand-blue focus:outline-none bg-white"
              >
                <option value="">Select latch...</option>
                {LATCH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Closer</label>
              <select
                value={selectedCloser}
                onChange={(e) => setSelectedCloser(e.target.value)}
                className="w-full h-12 rounded-xl border-2 border-border-custom px-3 text-base font-medium focus:border-brand-blue focus:outline-none bg-white"
              >
                <option value="">Select closer...</option>
                {CLOSER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Inside Release</label>
              <select
                value={selectedRelease}
                onChange={(e) => setSelectedRelease(e.target.value)}
                className="w-full h-12 rounded-xl border-2 border-border-custom px-3 text-base font-medium focus:border-brand-blue focus:outline-none bg-white"
              >
                <option value="">Select inside release...</option>
                {INSIDE_RELEASE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => {
                const [hingeMfr, hingeModel] = selectedHinge.split("|")
                const [latchMfr, latchModel] = selectedLatch.split("|")
                updateSpecs({
                  hingeMfrName: hingeMfr || undefined,
                  hingeModel: hingeModel || undefined,
                  latchMfrName: latchMfr || undefined,
                  latchModel: latchModel || undefined,
                  closerModel: selectedCloser || undefined,
                  insideRelease: selectedRelease || undefined,
                })
                goTo("SWING_GASKET")
              }}
              disabled={!selectedHinge || !selectedLatch}
              className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl"
            >
              Next
            </Button>
          </div>
        </InterviewStep>
      )}

      {/* ── NEW: Gasket Step ── */}
      {step === "SWING_GASKET" && (
        <InterviewStep
          question="Gasket Type?"
          description="Select the gasket for this door"
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="Magnetic"
              onClick={() => {
                updateSpecs({ gasketType: "MAGNETIC" })
                goTo("SWING_FINISH")
              }}
            />
            <ChoiceButton
              label="Neoprene"
              onClick={() => {
                updateSpecs({ gasketType: "NEOPRENE" })
                goTo("SWING_FINISH")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {step === "SWING_FINISH" && (
        <InterviewStep
          question="Door Finish?"
          description="Select the color for this door"
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="WPG (White Painted Galv)"
              onClick={() => {
                updateSpecs({ finish: "WPG" as FinishType })
                goTo("SWING_EXTRAS")
              }}
            />
            <ChoiceButton
              label="SS (Stainless Steel)"
              onClick={() => {
                updateSpecs({ finish: "SS" as FinishType })
                goTo("SWING_EXTRAS")
              }}
            />
            <ChoiceButton
              label="Gray"
              onClick={() => {
                updateSpecs({ finish: "Gray" as FinishType })
                goTo("SWING_EXTRAS")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {step === "SWING_EXTRAS" && (
        <InterviewStep
          question="Additional Items?"
          description="Select any extras for this door"
          onBack={goBack}
        >
          <ExtrasSelector
            specs={specs}
            onComplete={(extras) => {
              updateSpecs(extras)
              finalize(extras)
            }}
          />
        </InterviewStep>
      )}

      {/* ── SLIDER BRANCH ── */}

      {step === "SLIDER_TEMP" && (
        <InterviewStep
          question="Cooler or Freezer?"
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="Cooler"
              onClick={() => {
                updateSpecs({ temperatureType: "COOLER", doorCategory: "SLIDING" })
                goTo("SLIDER_SIDE")
              }}
            />
            <ChoiceButton
              label="Freezer"
              onClick={() => {
                updateSpecs({ temperatureType: "FREEZER", doorCategory: "SLIDING" })
                goTo("SLIDER_SIDE")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {step === "SLIDER_SIDE" && (
        <InterviewStep
          question="Slide Direction?"
          description="Which way does the door slide?"
          onBack={goBack}
        >
          <div className="grid grid-cols-2 gap-3">
            <ChoiceButton
              label="Left"
              onClick={() => {
                updateSpecs({ slideSide: "LEFT" })
                goTo("SLIDER_WIDTH")
              }}
            />
            <ChoiceButton
              label="Right"
              onClick={() => {
                updateSpecs({ slideSide: "RIGHT" })
                goTo("SLIDER_WIDTH")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {step === "SLIDER_WIDTH" && (
        <InterviewStep
          question="Clear Opening Width?"
          onBack={goBack}
        >
          <DimensionInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => {
              updateSpecs({ widthInClear: inputValue.trim() })
              goTo("SLIDER_HEIGHT")
            }}
            placeholder='e.g. 60"'
          />
        </InterviewStep>
      )}

      {step === "SLIDER_HEIGHT" && (
        <InterviewStep
          question="Clear Opening Height?"
          onBack={goBack}
        >
          <DimensionInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => {
              updateSpecs({
                heightInClear: inputValue.trim(),
                gasketType: "NEOPRENE",
              })
              goTo("SLIDER_FINISH")
            }}
            placeholder='e.g. 84"'
          />
        </InterviewStep>
      )}

      {step === "SLIDER_FINISH" && (
        <InterviewStep
          question="Door Finish?"
          description="Select the color for this door"
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="WPG (White Painted Galv)"
              onClick={() => finalize({ finish: "WPG" as FinishType })}
            />
            <ChoiceButton
              label="SS (Stainless Steel)"
              onClick={() => finalize({ finish: "SS" as FinishType })}
            />
            <ChoiceButton
              label="Gray"
              onClick={() => finalize({ finish: "Gray" as FinishType })}
            />
          </div>
        </InterviewStep>
      )}
    </div>
  )
}

/** Get a human-readable description of what standard hardware will be applied */
function getHardwareDescription(
  category?: DoorCategory,
  widthInClear?: string,
): string {
  const hw = getStandardHardware(category, widthInClear)
  if (!hw.hingeModel) return "No standard hardware for this door type"
  const parts: string[] = []
  if (hw.hingeModel) parts.push(`${hw.hingeMfrName} ${hw.hingeModel} (${hw.hingeQty})`)
  if (hw.latchModel) parts.push(`${hw.latchMfrName} ${hw.latchModel}`)
  if (hw.closerModel) parts.push(hw.closerModel)
  return parts.join(" + ")
}

/** Extras selector with toggleable chips */
function ExtrasSelector({
  specs,
  onComplete,
}: {
  specs: Partial<DoorSpecs>
  onComplete: (extras: Partial<DoorSpecs>) => void
}) {
  const [weatherShield, setWeatherShield] = useState(specs.weatherShield || false)
  const [thresholdPlate, setThresholdPlate] = useState(specs.thresholdPlate || false)
  const [isExterior, setIsExterior] = useState(specs.isExterior || false)
  const [additionalItems, setAdditionalItems] = useState<string[]>(specs.additionalItems || [])
  const [customExtra, setCustomExtra] = useState("")

  return (
    <div className="space-y-4">
      {/* Toggle chips */}
      <div className="space-y-2">
        <ChipToggle label="Weather Shield" checked={weatherShield} onChange={setWeatherShield} />
        <ChipToggle label="Threshold Plate" checked={thresholdPlate} onChange={setThresholdPlate} />
        <ChipToggle label="Exterior Door" checked={isExterior} onChange={setIsExterior} />
      </div>

      {/* Custom extra */}
      <div className="flex gap-2">
        <Input
          value={customExtra}
          onChange={(e) => setCustomExtra(e.target.value)}
          placeholder="Other item..."
          className="h-10"
          onKeyDown={(e) => {
            if (e.key === "Enter" && customExtra.trim()) {
              setAdditionalItems((items) => [...items, customExtra.trim()])
              setCustomExtra("")
            }
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (customExtra.trim()) {
              setAdditionalItems((items) => [...items, customExtra.trim()])
              setCustomExtra("")
            }
          }}
          disabled={!customExtra.trim()}
          className="h-10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {additionalItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {additionalItems.map((item, i) => (
            <span key={i} className="px-3 py-1 bg-brand-blue/10 text-brand-blue text-sm rounded-full font-medium flex items-center gap-1">
              {item}
              <button onClick={() => setAdditionalItems((items) => items.filter((_, idx) => idx !== i))} className="ml-1 text-brand-blue/60 hover:text-brand-blue">
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      <Button
        onClick={() =>
          onComplete({
            weatherShield,
            thresholdPlate,
            isExterior,
            additionalItems: additionalItems.length > 0 ? additionalItems : undefined,
          })
        }
        className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl"
      >
        Review Door Specs
      </Button>
    </div>
  )
}

function ChipToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between py-3 px-4 rounded-xl border-2 transition-all min-h-[44px] ${
        checked
          ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
          : "border-border-custom bg-white text-text-primary"
      }`}
    >
      <span className="font-medium">{label}</span>
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          checked ? "border-brand-blue bg-brand-blue" : "border-border-custom"
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  )
}
