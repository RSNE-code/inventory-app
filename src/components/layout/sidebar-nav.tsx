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
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/8">
        <div className="rounded-lg bg-white px-2 py-1 shrink-0 shadow-brand">
          <Image
            src="/logo.jpg"
            alt="RSNE"
            width={80}
            height={32}
            className="h-6 w-auto"
          />
        </div>
        <span className="text-white/70 text-sm font-semibold tracking-tight">Inventory</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
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
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-brand-blue-bright")} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/8">
        <p className="text-[11px] text-white/30 font-medium">RSNE Inventory v1.0</p>
      </div>
    </aside>
  )
}
