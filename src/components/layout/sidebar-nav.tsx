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
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 bg-navy z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="rounded bg-white px-1.5 py-0.5 shrink-0">
          <Image
            src="/logo.jpg"
            alt="RSNE"
            width={80}
            height={32}
            className="h-6 w-auto"
          />
        </div>
        <span className="text-white/80 text-sm font-medium">Inventory</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-navy-light text-white"
                  : "text-white/60 hover:text-white hover:bg-navy-light/50"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-xs text-white/40">RSNE Inventory v1.0</p>
      </div>
    </aside>
  )
}
