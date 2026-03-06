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
          <Card className="p-4 rounded-xl border-border-custom hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PackageCheck className="h-5 w-5 text-brand-blue" />
                <div>
                  <h3 className="font-semibold text-navy">Receive Material</h3>
                  <p className="text-text-muted text-xs">Log incoming deliveries</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-text-muted" />
            </div>
          </Card>
        </Link>

        <Card className="p-4 rounded-xl border-border-custom">
          <div className="flex items-center gap-3 mb-3">
            <Users className="h-5 w-5 text-brand-blue" />
            <h3 className="font-semibold text-navy">User Management</h3>
          </div>
          <p className="text-text-secondary text-sm">
            Manage team members and their roles. Admin access required.
          </p>
          <p className="text-text-muted text-xs mt-2 italic">
            Full user management coming soon
          </p>
        </Card>

        <Card className="p-4 rounded-xl border-border-custom">
          <div className="flex items-center gap-3 mb-3">
            <Info className="h-5 w-5 text-brand-blue" />
            <h3 className="font-semibold text-navy">About</h3>
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
          className="w-full h-12 text-status-red border-status-red/30 hover:bg-status-red/5"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
