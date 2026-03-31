"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Invalid email or password")
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-0 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3">
            <Image
              src="/logo.jpg"
              alt="RSNE"
              width={240}
              height={97}
              priority
            />
          </div>
          <p className="text-text-muted text-sm mt-1">
            Sign in to manage inventory
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@rsofne.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>
            {error && (
              <p className="text-status-red text-sm text-center">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowForgot(!showForgot)}
                className="text-xs text-text-muted hover:text-navy transition-colors"
              >
                Forgot password?
              </button>
              {showForgot && (
                <p className="text-xs text-text-muted mt-2 bg-surface-secondary rounded-lg px-3 py-2">
                  Contact your administrator to reset your password.
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
