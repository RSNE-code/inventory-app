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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-custom/60 bg-white/95 backdrop-blur-md md:hidden">
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
                "flex flex-col items-center gap-0.5 px-3 py-2",
                "min-w-[48px] transition-all duration-200",
                isActive
                  ? "text-brand-blue"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
              <span className={cn(
                "text-[11px] font-semibold",
                isActive && "text-brand-blue"
              )}>{tab.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
