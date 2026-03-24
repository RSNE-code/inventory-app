"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { Toaster } from "@/components/ui/sonner"
import { initPushNotifications } from "@/lib/push-notifications"
import { CelebrationProvider, useCelebration } from "@/hooks/use-celebration"
import { CelebrationOverlay } from "@/components/shared/celebration-overlay"

function CelebrationRenderer() {
  const { isActive, variant, dismiss } = useCelebration()
  if (!isActive || variant === null) return null
  return <CelebrationOverlay variant={variant} onComplete={dismiss} />
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: true,
          },
        },
      })
  )

  useEffect(() => {
    initPushNotifications()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <CelebrationProvider>
        {children}
        <CelebrationRenderer />
      </CelebrationProvider>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  )
}
