"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ClipboardList, Package, Factory, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const tabs = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "BOMs", href: "/boms", icon: ClipboardList },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Assemblies", href: "/assemblies", icon: Factory, comingSoon: true },
  { name: "More", href: "/settings", icon: MoreHorizontal },
]

export function BottomNav() {
  const pathname = usePathname()

  if (pathname === "/login") return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-custom bg-white">
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href)
          const Icon = tab.icon

          if (tab.comingSoon) {
            return (
              <button
                key={tab.name}
                onClick={() => toast.info(`${tab.name} coming in Phase 2`)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 text-text-muted",
                  "min-w-[48px] transition-colors duration-200"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tab.name}</span>
              </button>
            )
          }

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2",
                "min-w-[48px] transition-colors duration-200",
                isActive
                  ? "text-brand-blue"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
