import { createClient } from "./supabase/server"
import { prisma } from "./db"
import { Role } from "@prisma/client"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { headers } from "next/headers"

export async function getCurrentUser() {
  // Check for Bearer token first (mobile app sends JWT this way)
  const headerStore = await headers()
  const authHeader = headerStore.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user: tokenUser } } = await supabase.auth.getUser(token)

    if (tokenUser?.email) {
      const user = await prisma.user.findUnique({
        where: { email: tokenUser.email },
      })
      return user
    }
  }

  // Fall back to cookie-based auth (web app)
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser?.email) return null

  const user = await prisma.user.findUnique({
    where: { email: authUser.email },
  })

  return user
}

export function requireRole(userRole: Role, allowedRoles: Role[]) {
  if (!allowedRoles.includes(userRole)) {
    throw new Error("Forbidden: insufficient permissions")
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}
