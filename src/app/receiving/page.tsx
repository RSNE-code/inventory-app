"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { ReceivingFlow } from "@/components/receiving/receiving-flow"
import { ReceiptHistory } from "@/components/receiving/receipt-history"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { cn } from "@/lib/utils"

type Tab = "receive" | "history"

export default function ReceivingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("receive")

  return (
    <div>
      <Header title="Receive Material" showMenu />
      <Breadcrumb items={[{ label: "Receiving" }]} />

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-4">
        <button
          onClick={() => setActiveTab("receive")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors",
            activeTab === "receive"
              ? "border-brand-orange text-brand-orange"
              : "border-transparent text-text-muted hover:text-navy"
          )}
        >
          AI Receive
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors",
            activeTab === "history"
              ? "border-brand-orange text-brand-orange"
              : "border-transparent text-text-muted hover:text-navy"
          )}
        >
          Receipt History
        </button>
      </div>

      <div className="p-4">
        {activeTab === "receive" ? <ReceivingFlow /> : <ReceiptHistory />}
      </div>
    </div>
  )
}
