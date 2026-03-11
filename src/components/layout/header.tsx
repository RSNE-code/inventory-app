"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface HeaderProps {
  title: string
  showBack?: boolean
  action?: React.ReactNode
}

export function Header({ title, showBack, action }: HeaderProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/8 bg-navy px-4">
      {showBack ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      ) : (
        <div className="rounded-lg bg-white px-1.5 py-0.5 shrink-0">
          <Image
            src="/logo.jpg"
            alt="RSNE"
            width={80}
            height={32}
            className="h-6 w-auto"
          />
        </div>
      )}
      <h1 className="flex-1 text-lg font-bold text-white truncate tracking-tight">
        {title}
      </h1>
      {action}
    </header>
  )
}
