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
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-navy-light flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Atmospheric layers */}
      <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-blue/[0.07] rounded-full blur-3xl pointer-events-none" />

      {/* Login card */}
      <Card className="relative z-10 w-full max-w-[420px] border-0 rounded-2xl shadow-brand-lg bg-white animate-card-enter">
        <CardHeader className="text-center pb-4 pt-8 px-6">
          {/* Logo in soft pill */}
          <div className="mx-auto mb-5 animate-fade-in-up stagger-1">
            <div className="inline-block rounded-xl bg-surface-secondary px-5 py-3 shadow-brand">
              <Image
                src="/logo.jpg"
                alt="RSNE"
                width={200}
                height={81}
                className="h-12 w-auto"
                priority
              />
            </div>
          </div>

          {/* Brand accent line */}
          <div className="mx-auto w-12 h-1 rounded-full bg-brand-blue mb-4 animate-fade-in-up stagger-2" />

          <p className="text-text-secondary text-sm font-medium animate-fade-in-up stagger-3">
            Sign in to manage inventory
          </p>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 animate-fade-in-up stagger-4">
              <Label htmlFor="email" className="text-text-primary font-medium text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@rsofne.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl text-base bg-surface-secondary border-transparent focus:bg-white focus:border-brand-blue transition-all duration-300"
              />
            </div>
            <div className="space-y-2 animate-fade-in-up stagger-5">
              <Label htmlFor="password" className="text-text-primary font-medium text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl text-base bg-surface-secondary border-transparent focus:bg-white focus:border-brand-blue transition-all duration-300"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-status-red/10 border border-status-red/20 px-4 py-3 animate-ios-spring-in">
                <p className="text-status-red text-sm text-center font-medium">{error}</p>
              </div>
            )}

            <div className="animate-fade-in-up stagger-6 pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-brand-orange hover:bg-brand-orange-hover active:scale-[0.98] text-white font-semibold text-base shadow-md transition-all duration-300 disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </div>

            <div className="text-center pt-2 animate-fade-in-up stagger-7">
              <button
                type="button"
                onClick={() => setShowForgot(!showForgot)}
                className="text-sm text-text-muted hover:text-brand-blue py-2 px-3 -mx-3 rounded-lg transition-colors duration-300"
              >
                Forgot password?
              </button>
              {showForgot && (
                <p className="text-xs text-text-muted mt-2 bg-surface-secondary rounded-xl px-4 py-3 animate-ios-spring-in">
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
