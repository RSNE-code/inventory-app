import { createClient } from "./supabase/server"
import { prisma } from "./db"
import { Role } from "@prisma/client"

export async function getCurrentUser() {
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
