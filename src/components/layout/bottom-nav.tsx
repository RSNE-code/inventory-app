"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, PackageCheck, Package, ClipboardList, Factory } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Receive", href: "/receiving", icon: PackageCheck },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "BOMs", href: "/boms", icon: ClipboardList },
  { name: "Assemblies", href: "/assemblies", icon: Factory },
]

export function BottomNav() {
  const pathname = usePathname()
  const navRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  const activeIndex = tabs.findIndex((tab) =>
    tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)
  )

  // Measure active tab for sliding indicator
  useEffect(() => {
    const container = navRef.current
    if (!container || activeIndex < 0) return
    const links = container.querySelectorAll<HTMLAnchorElement>("a")
    if (links[activeIndex]) {
      const el = links[activeIndex]
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [activeIndex])

  if (pathname === "/login") return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-custom/60 bg-white/95 backdrop-blur-md md:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div ref={navRef} className="relative flex h-16 items-center justify-around">
        {/* Sliding pill indicator */}
        {activeIndex >= 0 && (
          <div
            className="absolute top-1 bottom-1 rounded-xl bg-brand-blue/8 tab-indicator"
            style={{ left: indicator.left, width: indicator.width }}
          />
        )}

        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href)
          const Icon = tab.icon

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "relative z-10 flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl",
                "min-w-[48px] transition-all duration-300",
                isActive
                  ? "text-brand-blue"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-all duration-300", isActive && "scale-110")} />
              <span className={cn(
                "text-[11px]",
                isActive ? "font-bold text-brand-blue" : "font-semibold"
              )}>{tab.name}</span>
              {isActive && (
                <div className="h-1 w-1 rounded-full bg-brand-blue animate-nav-dot" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
