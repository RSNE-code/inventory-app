"use client"

import { SidebarNav } from "@/components/layout/sidebar-nav"
import { BottomNav } from "@/components/layout/bottom-nav"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SidebarNav />
      <main className="pb-16 md:pb-0 md:ml-60">
        {children}
      </main>
      <BottomNav />
    </>
  )
}
