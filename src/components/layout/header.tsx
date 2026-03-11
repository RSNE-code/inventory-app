"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Menu, X, ClipboardCheck, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

interface HeaderProps {
  title: string
  showBack?: boolean
  showMenu?: boolean
  action?: React.ReactNode
}

export function Header({ title, showBack, showMenu, action }: HeaderProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/8 bg-navy px-4">
      {showBack && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div className="rounded-lg bg-white px-1.5 py-0.5 shrink-0">
        <Image
          src="/logo.jpg"
          alt="RSNE"
          width={80}
          height={32}
          className="h-6 w-auto"
        />
      </div>
      <h1 className="flex-1 text-lg font-bold text-white truncate tracking-tight">
        {title}
      </h1>
      {action}
      {showMenu && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-brand-md border border-border-custom z-50 py-1 animate-fade-in">
                <Link
                  href="/cycle-counts"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-navy hover:bg-surface-secondary transition-colors"
                >
                  <ClipboardCheck className="h-4 w-4 text-text-muted" />
                  Cycle Counts
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-navy hover:bg-surface-secondary transition-colors"
                >
                  <Settings className="h-4 w-4 text-text-muted" />
                  Settings
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  )
}
