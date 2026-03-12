"use client"

import Link from "next/link"
import { PackageCheck, Package, ClipboardList, Factory, ClipboardCheck } from "lucide-react"

const actions = [
  { label: "Receive", href: "/receiving", icon: PackageCheck },
  { label: "Create BOM", href: "/boms/new", icon: ClipboardList },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Build", href: "/assemblies/new", icon: Factory },
  { label: "Count", href: "/cycle-counts", icon: ClipboardCheck },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-5 gap-2">
      {actions.map((action) => (
        <Link key={action.label} href={action.href}>
          <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-secondary hover:bg-brand-blue/6 active:scale-[0.97] transition-all duration-200 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-brand group-hover:shadow-brand-md transition-shadow">
              <action.icon className="h-5 w-5 text-brand-blue" />
            </div>
            <span className="text-[12px] font-semibold text-text-secondary text-center leading-tight">{action.label}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
