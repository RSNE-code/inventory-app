import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { parseDoorSpecs } from "@/lib/ai/parse-door-specs"
import { z } from "zod"

const requestSchema = z.object({
  text: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireRole(user.role, [
      "ADMIN",
      "OPERATIONS_MANAGER",
      "OFFICE_MANAGER",
      "SALES_MANAGER",
    ])

    const body = await request.json()
    const { text } = requestSchema.parse(body)

    const result = await parseDoorSpecs(text)

    return NextResponse.json({ data: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized")
      return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden"))
      return NextResponse.json({ error: message }, { status: 403 })
    console.error("Door spec parse error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
