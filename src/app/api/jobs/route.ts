import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

const createJobSchema = z.object({
  name: z.string().min(1),
  number: z.string().optional().nullable(),
})

export async function GET() {
  try {
    await requireAuth()

    const jobs = await prisma.job.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ data: jobs })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const body = await request.json()
    const data = createJobSchema.parse(body)

    const job = await prisma.job.create({ data })
    return NextResponse.json({ data: job }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
