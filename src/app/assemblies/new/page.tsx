"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { DoorCreationFlow } from "@/components/doors/door-creation-flow"
import { FabCreationFlow } from "@/components/fab/fab-creation-flow"
import { DoorOpen, Layers } from "lucide-react"

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
  const searchParams = useSearchParams()
  const urlType = searchParams.get("type")
  const fromBom = searchParams.get("fromBom")
  const jobNameParam = searchParams.get("jobName")
  const doorHintParam = searchParams.get("doorHint")

  const [flow, setFlow] = useState<"choose" | "door" | "fab">("choose")
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized) return
    if (urlType === "DOOR") setFlow("door")
    else if (urlType === "PANEL") setFlow("fab")
    setInitialized(true)
  }, [urlType, initialized])

  const title = flow === "door" ? "New Door" : flow === "fab" ? "New Assembly" : "New Assembly"

  return (
    <div>
      <Header title={title} />

      <div className="p-4 pb-28 space-y-4 overscroll-fix">
        {!initialized && (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Type chooser — only shown when no URL param */}
        {initialized && flow === "choose" && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="text-center space-y-1 px-2">
              <h2 className="text-xl font-bold text-navy">What are you building?</h2>
              <p className="text-sm text-text-secondary">Select a category to get started</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setFlow("door")}
                className="p-5 rounded-xl border-2 border-border-custom bg-white text-left hover:border-brand-blue hover:bg-brand-blue/4 transition-all duration-200 active:scale-[0.97]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/10">
                    <DoorOpen className="h-5 w-5 text-brand-blue" />
                  </div>
                  <div>
                    <p className="font-bold text-navy text-base">New Door</p>
                    <p className="text-xs text-text-muted mt-0.5">Cooler & freezer doors</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFlow("fab")}
                className="p-5 rounded-xl border-2 border-border-custom bg-white text-left hover:border-brand-blue hover:bg-brand-blue/4 transition-all duration-200 active:scale-[0.97]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/10">
                    <Layers className="h-5 w-5 text-brand-blue" />
                  </div>
                  <div>
                    <p className="font-bold text-navy text-base">New Panel / Floor / Ramp</p>
                    <p className="text-xs text-text-muted mt-0.5">Wall panels, floor panels, ramps</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Door creation flow */}
        {initialized && flow === "door" && (
          <DoorCreationFlow
            prefillJobName={jobNameParam || undefined}
            fromBomId={fromBom || undefined}
            doorHint={doorHintParam || undefined}
          />
        )}

        {/* Fab creation flow (panels, floors, ramps) */}
        {initialized && flow === "fab" && <FabCreationFlow />}
      </div>
    </div>
  )
}
