import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"

const createJobSchema = z.object({
  name: z.string().min(1),
  number: z.string().optional().nullable(),
  client: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  contractNumber: z.string().optional().nullable(),
  gcRef: z.string().optional().nullable(),
  contractValue: z.number().optional().nullable(),
  services: z.string().optional().nullable(),
  proposalDate: z.string().optional().nullable(),
  estStartDate: z.string().optional().nullable(),
  estEndDate: z.string().optional().nullable(),
  salesLead: z.string().optional().nullable(),
  projectManager: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const status = searchParams.get("status") || "ACTIVE"
    const search = searchParams.get("search") || ""

    const where: Record<string, unknown> = { status }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { number: { contains: search, mode: "insensitive" } },
        { client: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ]
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ data: jobs })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.startsWith("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SALES_MANAGER"])
    const body = await request.json()
    const data = createJobSchema.parse(body)

    const job = await prisma.job.create({
      data: {
        ...data,
        contractValue: data.contractValue != null ? data.contractValue : undefined,
        proposalDate: data.proposalDate ? new Date(data.proposalDate) : undefined,
        estStartDate: data.estStartDate ? new Date(data.estStartDate) : undefined,
        estEndDate: data.estEndDate ? new Date(data.estEndDate) : undefined,
      },
    })
    return NextResponse.json({ data: job }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.startsWith("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
