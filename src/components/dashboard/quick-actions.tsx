"use client"

import Link from "next/link"
import { Plus, PackageCheck, Package, ClipboardList } from "lucide-react"

const actions = [
  { label: "Receive Material", href: "/receiving", icon: PackageCheck },
  { label: "Create BOM", href: "/boms/new", icon: ClipboardList },
  { label: "View Inventory", href: "/inventory", icon: Package },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((action) => (
        <Link key={action.label} href={action.href}>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-secondary hover:bg-border-custom transition-colors duration-200">
            <action.icon className="h-6 w-6 text-brand-blue" />
            <span className="text-xs font-medium text-text-secondary text-center">{action.label}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
