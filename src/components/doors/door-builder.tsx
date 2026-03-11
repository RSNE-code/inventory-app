"use client"

import { useState } from "react"
import type { DoorSpecs, Cutout, DoorCategory } from "@/lib/door-specs"
import { getStandardHardware, calculateHeaterCable } from "@/lib/door-specs"
import { InterviewStep, ChoiceButton, DimensionInput } from "./interview-step"
import { SwingDoorDiagram } from "./door-diagram-swing"
import { SliderDoorDiagram } from "./door-diagram-slider"
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
  // Swing branch — features
  | "SWING_TEMP"
  | "SWING_HINGE"
  | "SWING_HARDWARE"
  | "SWING_HARDWARE_CUSTOM"
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
  SWING_TEMP: 2, SWING_HINGE: 2, SWING_HARDWARE: 2, SWING_HARDWARE_CUSTOM: 2, SWING_FINISH: 2, SWING_EXTRAS: 2,
  SLIDER_TEMP: 1, SLIDER_SIDE: 1, SLIDER_WIDTH: 1, SLIDER_HEIGHT: 1, SLIDER_FINISH: 1,
  DONE: 3,
}

const PROGRESS_LABELS = ["Type", "Dimensions", "Features", "Review"]

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
  const [customHinge, setCustomHinge] = useState("")
  const [customLatch, setCustomLatch] = useState("")
  const [customCloser, setCustomCloser] = useState("")
  const [customFinish, setCustomFinish] = useState("")
  const [frameLHS, setFrameLHS] = useState("")
  const [frameRHS, setFrameRHS] = useState("")
  const [frameTop, setFrameTop] = useState("")

  // Step history for back navigation
  const [history, setHistory] = useState<BuilderStep[]>([])

  function goTo(next: BuilderStep) {
    setHistory((h) => [...h, step])
    setInputValue("")
    setStep(next)
  }

  function goBack() {
    if (history.length === 0) {
      onBack()
      return
    }
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setInputValue("")
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

  return (
    <div className="space-y-4">
      <StepProgress steps={PROGRESS_LABELS} currentStep={currentGroup} />

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
          diagram={
            <SwingDoorDiagram
              width={inputValue || undefined}
              height={specs.heightInClear}
              jambDepth={specs.jambDepth}
            />
          }
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
          diagram={
            <SwingDoorDiagram
              width={specs.widthInClear}
              height={inputValue || undefined}
              jambDepth={specs.jambDepth}
            />
          }
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
          diagram={
            <SwingDoorDiagram
              width={specs.widthInClear}
              height={specs.heightInClear}
              jambDepth={inputValue || undefined}
            />
          }
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
          question="Standard Frame or Custom?"
          description="Custom lets you set LHS, RHS, and Top dimensions separately"
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="Standard Frame"
              onClick={() => {
                updateSpecs({ frameCustom: false, frameType: "FULL_FRAME" })
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
                // Show custom frame inputs inline
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
              <label className="text-sm text-gray-500 mb-1 block">Left Side (LHS)</label>
              <input
                type="text"
                inputMode="decimal"
                value={frameLHS}
                onChange={(e) => setFrameLHS(e.target.value)}
                placeholder='e.g. 4"'
                className="w-full h-12 text-center text-lg font-bold rounded-xl border-2 border-gray-200 focus:border-brand-blue focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Right Side (RHS)</label>
              <input
                type="text"
                inputMode="decimal"
                value={frameRHS}
                onChange={(e) => setFrameRHS(e.target.value)}
                placeholder='e.g. 4"'
                className="w-full h-12 text-center text-lg font-bold rounded-xl border-2 border-gray-200 focus:border-brand-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Top (Header)</label>
              <input
                type="text"
                inputMode="decimal"
                value={frameTop}
                onChange={(e) => setFrameTop(e.target.value)}
                placeholder='e.g. 4"'
                className="w-full h-12 text-center text-lg font-bold rounded-xl border-2 border-gray-200 focus:border-brand-blue focus:outline-none"
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
          description="Openings cut into the door panel (for pass-throughs, vents, etc.)"
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
                setCutouts([{ floorToBottom: "", floorToTop: "", frameWidth: "" }])
                goTo("SWING_CUTOUT_DETAIL")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {step === "SWING_CUTOUT_DETAIL" && (
        <InterviewStep
          question={`Cutout Details (${cutouts.length})`}
          description="Enter dimensions for each cutout"
          onBack={goBack}
        >
          <div className="space-y-4">
            {cutouts.map((cutout, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2 relative">
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
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500">Floor→Bottom</label>
                    <Input
                      value={cutout.floorToBottom}
                      onChange={(e) => {
                        const updated = [...cutouts]
                        updated[i] = { ...updated[i], floorToBottom: e.target.value }
                        setCutouts(updated)
                      }}
                      placeholder='24"'
                      className="h-10 text-center text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Floor→Top</label>
                    <Input
                      value={cutout.floorToTop}
                      onChange={(e) => {
                        const updated = [...cutouts]
                        updated[i] = { ...updated[i], floorToTop: e.target.value }
                        setCutouts(updated)
                      }}
                      placeholder='48"'
                      className="h-10 text-center text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Width</label>
                    <Input
                      value={cutout.frameWidth}
                      onChange={(e) => {
                        const updated = [...cutouts]
                        updated[i] = { ...updated[i], frameWidth: e.target.value }
                        setCutouts(updated)
                      }}
                      placeholder='18"'
                      className="h-10 text-center text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={() =>
                setCutouts((c) => [...c, { floorToBottom: "", floorToTop: "", frameWidth: "" }])
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
                goTo("SWING_TEMP")
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
          diagram={
            <SwingDoorDiagram
              width={specs.widthInClear}
              height={specs.heightInClear}
              jambDepth={specs.jambDepth}
              sillHeight={inputValue || "?"}
            />
          }
        >
          <DimensionInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => {
              updateSpecs({ sillHeight: inputValue.trim() })
              goTo("SWING_TEMP")
            }}
            placeholder='e.g. 6"'
          />
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
                goTo("SWING_HINGE")
              }}
            />
            <ChoiceButton
              label="Freezer"
              onClick={() => {
                updateSpecs({
                  temperatureType: "FREEZER",
                  doorCategory: "HINGED_FREEZER",
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
                  gasketType: hw.gasketType || "MAGNETIC",
                })
                goTo("SWING_FINISH")
              }}
            />
            <ChoiceButton
              label="No — Specify Custom"
              onClick={() => {
                setCustomHinge("")
                setCustomLatch("")
                setCustomCloser("")
                goTo("SWING_HARDWARE_CUSTOM")
              }}
            />
          </div>
        </InterviewStep>
      )}

      {step === "SWING_HARDWARE_CUSTOM" && (
        <InterviewStep
          question="Custom Hardware"
          description="Enter hinge, latch, and closer models"
          onBack={goBack}
        >
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Hinge (make + model)</label>
              <Input
                value={customHinge}
                onChange={(e) => setCustomHinge(e.target.value)}
                placeholder="e.g. Kason K1277"
                className="h-12 text-center"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Latch (make + model)</label>
              <Input
                value={customLatch}
                onChange={(e) => setCustomLatch(e.target.value)}
                placeholder="e.g. Kason K56"
                className="h-12 text-center"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Closer (model)</label>
              <Input
                value={customCloser}
                onChange={(e) => setCustomCloser(e.target.value)}
                placeholder="e.g. DENT D276 (or none)"
                className="h-12 text-center"
              />
            </div>
            <Button
              onClick={() => {
                updateSpecs({
                  hingeMfrName: customHinge.split(" ")[0] || undefined,
                  hingeModel: customHinge.trim() || undefined,
                  latchMfrName: customLatch.split(" ")[0] || undefined,
                  latchModel: customLatch.trim() || undefined,
                  closerModel: customCloser.trim() || undefined,
                })
                goTo("SWING_FINISH")
              }}
              className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl"
            >
              Next
            </Button>
          </div>
        </InterviewStep>
      )}

      {step === "SWING_FINISH" && (
        <InterviewStep
          question="Door Finish?"
          description="Select the skin / finish for this door"
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="WPG (White Painted Galv)"
              onClick={() => {
                updateSpecs({ finish: "WPG" })
                goTo("SWING_EXTRAS")
              }}
            />
            <ChoiceButton
              label="White/White"
              onClick={() => {
                updateSpecs({ finish: "White/White" })
                goTo("SWING_EXTRAS")
              }}
            />
            <ChoiceButton
              label="Stainless Steel"
              onClick={() => {
                updateSpecs({ finish: "Stainless Steel" })
                goTo("SWING_EXTRAS")
              }}
            />
            <ChoiceButton
              label="Galvalume"
              onClick={() => {
                updateSpecs({ finish: "Galvalume" })
                goTo("SWING_EXTRAS")
              }}
            />
            <div className="pt-1">
              <label className="text-sm text-gray-500 mb-1 block">Other (custom)</label>
              <div className="flex gap-2">
                <Input
                  value={customFinish}
                  onChange={(e) => setCustomFinish(e.target.value)}
                  placeholder="e.g. Brushed Aluminum"
                  className="h-12 text-center flex-1"
                />
                <Button
                  onClick={() => {
                    if (customFinish.trim()) {
                      updateSpecs({ finish: customFinish.trim() })
                      goTo("SWING_EXTRAS")
                    }
                  }}
                  disabled={!customFinish.trim()}
                  className="h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl px-6"
                >
                  Next
                </Button>
              </div>
            </div>
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
          diagram={
            <SliderDoorDiagram
              width={inputValue || undefined}
              height={specs.heightInClear}
              slideSide={specs.slideSide}
            />
          }
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
          diagram={
            <SliderDoorDiagram
              width={specs.widthInClear}
              height={inputValue || undefined}
              slideSide={specs.slideSide}
            />
          }
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
          description="Select the skin / finish for this door"
          onBack={goBack}
        >
          <div className="space-y-3">
            <ChoiceButton
              label="WPG (White Painted Galv)"
              onClick={() => finalize({ finish: "WPG" })}
            />
            <ChoiceButton
              label="White/White"
              onClick={() => finalize({ finish: "White/White" })}
            />
            <ChoiceButton
              label="Stainless Steel"
              onClick={() => finalize({ finish: "Stainless Steel" })}
            />
            <ChoiceButton
              label="Galvalume"
              onClick={() => finalize({ finish: "Galvalume" })}
            />
            <div className="pt-1">
              <label className="text-sm text-gray-500 mb-1 block">Other (custom)</label>
              <div className="flex gap-2">
                <Input
                  value={customFinish}
                  onChange={(e) => setCustomFinish(e.target.value)}
                  placeholder="e.g. Brushed Aluminum"
                  className="h-12 text-center flex-1"
                />
                <Button
                  onClick={() => {
                    if (customFinish.trim()) {
                      finalize({ finish: customFinish.trim() })
                    }
                  }}
                  disabled={!customFinish.trim()}
                  className="h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl px-6"
                >
                  Done
                </Button>
              </div>
            </div>
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
  if (hw.gasketType) parts.push(`${hw.gasketType} gasket`)
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

  const presetExtras = [
    { key: "splash", label: "Exterior Splash Guard" },
    { key: "window", label: "Window" },
  ]

  function togglePreset(label: string) {
    setAdditionalItems((items) =>
      items.includes(label)
        ? items.filter((i) => i !== label)
        : [...items, label]
    )
  }

  return (
    <div className="space-y-4">
      {/* Toggle chips */}
      <div className="space-y-2">
        <ChipToggle label="Weather Shield" checked={weatherShield} onChange={setWeatherShield} />
        <ChipToggle label="Threshold Plate" checked={thresholdPlate} onChange={setThresholdPlate} />
        <ChipToggle label="Exterior Door" checked={isExterior} onChange={setIsExterior} />
        {presetExtras.map((e) => (
          <ChipToggle
            key={e.key}
            label={e.label}
            checked={additionalItems.includes(e.label)}
            onChange={() => togglePreset(e.label)}
          />
        ))}
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
      className={`w-full flex items-center justify-between py-3 px-4 rounded-xl border-2 transition-all ${
        checked
          ? "border-brand-blue bg-blue-50 text-brand-blue"
          : "border-gray-200 bg-white text-gray-700"
      }`}
    >
      <span className="font-medium">{label}</span>
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          checked ? "border-brand-blue bg-brand-blue" : "border-gray-300"
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
