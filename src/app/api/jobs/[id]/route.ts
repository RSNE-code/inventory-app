import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"

const updateJobSchema = z.object({
  name: z.string().min(1).optional(),
  number: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
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
  percentBilled: z.number().optional().nullable(),
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
    if (message.startsWith("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SALES_MANAGER"])
    const { id } = await params
    const body = await request.json()
    const data = updateJobSchema.parse(body)
    const job = await prisma.job.update({
      where: { id },
      data: {
        ...data,
        contractValue: data.contractValue !== undefined
          ? data.contractValue
          : undefined,
        percentBilled: data.percentBilled !== undefined
          ? data.percentBilled
          : undefined,
        proposalDate: data.proposalDate !== undefined
          ? (data.proposalDate ? new Date(data.proposalDate) : null)
          : undefined,
        estStartDate: data.estStartDate !== undefined
          ? (data.estStartDate ? new Date(data.estStartDate) : null)
          : undefined,
        estEndDate: data.estEndDate !== undefined
          ? (data.estEndDate ? new Date(data.estEndDate) : null)
          : undefined,
      },
    })
    return NextResponse.json({ data: job })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.startsWith("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
