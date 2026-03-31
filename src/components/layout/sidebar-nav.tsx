"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Factory,
  PackageCheck,
  ClipboardCheck,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "BOMs", href: "/boms", icon: ClipboardList },
  { name: "Assemblies", href: "/assemblies", icon: Factory },
  { name: "Receiving", href: "/receiving", icon: PackageCheck },
  { name: "Cycle Counts", href: "/cycle-counts", icon: ClipboardCheck },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()

  if (pathname === "/login") return null

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-16 bg-navy z-50">
      {/* Logo */}
      <div className="flex items-center justify-center py-4 border-b border-white/8">
        <div className="rounded-xl bg-white px-1.5 py-1 shrink-0 shadow-brand">
          <Image
            src="/logo.jpg"
            alt="RSNE"
            width={40}
            height={16}
            className="h-4 w-auto"
          />
        </div>
      </div>

      {/* Nav items — icon-only rail with tooltips */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              aria-label={item.name}
              className={cn(
                "flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-300",
                isActive
                  ? "bg-brand-blue/15 text-white ring-2 ring-brand-blue-bright/30"
                  : "text-white/50 hover:text-white/80 hover:bg-white/8"
              )}
            >
              <Icon className={cn("h-[20px] w-[20px]", isActive && "text-brand-blue-bright")} />
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="py-3 text-center border-t border-white/8">
        <p className="text-[10px] text-white/30 font-medium">v1.0</p>
      </div>
    </aside>
  )
}
