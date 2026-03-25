"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { LogOut, Users, Info, PackageCheck, ChevronRight } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div>
      <Header title="More" />

      <div className="p-4 space-y-4">
        <Link href="/receiving">
          <Card className="p-5 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md transition-all duration-300 active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/8">
                  <PackageCheck className="h-[18px] w-[18px] text-brand-blue" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy text-sm">Receive Material</h3>
                  <p className="text-text-muted text-xs">Log incoming deliveries</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted/30" />
            </div>
          </Card>
        </Link>

        <Card className="p-5 rounded-xl border-border-custom shadow-brand">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/8">
              <Users className="h-[18px] w-[18px] text-brand-blue" />
            </div>
            <h3 className="font-semibold text-navy text-sm">User Management</h3>
          </div>
          <p className="text-text-secondary text-sm">
            Manage team members and their roles. Admin access required.
          </p>
          <p className="text-text-muted text-xs mt-2 italic">
            Full user management coming soon
          </p>
        </Card>

        <Card className="p-5 rounded-xl border-border-custom shadow-brand">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/8">
              <Info className="h-[18px] w-[18px] text-brand-blue" />
            </div>
            <h3 className="font-semibold text-navy text-sm">About</h3>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-text-secondary">
              <span className="text-text-muted">Version:</span> 1.1.0 (Phase 2A)
            </p>
            <p className="text-text-secondary">
              <span className="text-text-muted">Built for:</span> RSNE
            </p>
          </div>
        </Card>

        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full h-12 rounded-xl text-status-red border-status-red/30 hover:bg-status-red/5"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
