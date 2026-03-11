import { NextRequest, NextResponse } from "next/server"
import { parseImageInput } from "@/lib/ai/parse"
import { getCurrentUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("image") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      )
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Image must be JPEG, PNG, WebP, or GIF" },
        { status: 400 }
      )
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be under 10MB" },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")

    // Single AI call handles parsing, catalog matching, supplier matching, and PO matching
    const result = await parseImageInput(base64, file.type)

    return NextResponse.json({
      data: {
        items: result.items,
        rawInput: "[image]",
        inputType: "image" as const,
        supplier: result.supplier,
        supplierId: result.supplierId,
        poNumber: result.poNumber,
        poId: result.poId,
        deliveryDate: result.deliveryDate,
      },
    })
  } catch (error) {
    console.error("[parse-image] Error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
