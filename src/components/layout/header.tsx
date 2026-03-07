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
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border-custom bg-navy px-4">
      {showBack ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-9 w-9 text-white hover:bg-navy-light"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      ) : (
        <Image
          src="/logo.jpg"
          alt="RSNE"
          width={80}
          height={32}
          className="h-8 w-auto"
        />
      )}
      <h1 className="flex-1 text-lg font-semibold text-white truncate">
        {title}
      </h1>
      {action}
    </header>
  )
}
