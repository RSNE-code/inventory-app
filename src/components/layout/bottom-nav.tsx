"use client"

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

  if (pathname === "/login") return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-custom/60 bg-white/95 backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-center justify-around">
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
                "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl",
                "min-w-[48px] transition-all duration-300",
                isActive
                  ? "text-brand-blue bg-brand-blue/10"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-all duration-300", isActive && "scale-110")} />
              <span className={cn(
                "text-[11px]",
                isActive ? "font-bold text-brand-blue" : "font-semibold"
              )}>{tab.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
