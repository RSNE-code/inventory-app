import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

const updateJobSchema = z.object({
  name: z.string().min(1).optional(),
  number: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const job = await prisma.job.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })
    return NextResponse.json({ data: job })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await request.json()
    const data = updateJobSchema.parse(body)
    const job = await prisma.job.update({ where: { id }, data })
    return NextResponse.json({ data: job })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
