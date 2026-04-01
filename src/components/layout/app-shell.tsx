"use client"

import { SidebarNav } from "@/components/layout/sidebar-nav"
import { BottomNav } from "@/components/layout/bottom-nav"
import { PageTransition } from "@/components/layout/page-transition"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SidebarNav />
      <main className="pb-20">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </>
  )
}
