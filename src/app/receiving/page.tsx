"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { ReceivingFlow } from "@/components/receiving/receiving-flow"
import { ReceiptHistory } from "@/components/receiving/receipt-history"
import { cn } from "@/lib/utils"

type Tab = "receive" | "history"

export default function ReceivingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("receive")

  return (
    <div>
      <Header title="Receive Material" showMenu />

      {/* Tab bar — segmented control */}
      <div className="px-4 pt-3">
        <div className="flex gap-1 bg-surface-secondary rounded-xl p-1">
          <button
            onClick={() => setActiveTab("receive")}
            className={cn(
              "flex-1 py-3 min-h-[44px] rounded-lg text-sm font-semibold transition-all duration-300",
              activeTab === "receive"
                ? "bg-white text-navy shadow-brand"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            AI Receive
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex-1 py-3 min-h-[44px] rounded-lg text-sm font-semibold transition-all duration-300",
              activeTab === "history"
                ? "bg-white text-navy shadow-brand"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            Receipt History
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === "receive" ? <ReceivingFlow /> : <ReceiptHistory />}
      </div>
    </div>
  )
}
