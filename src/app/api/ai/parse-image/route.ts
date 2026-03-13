import { NextRequest, NextResponse } from "next/server"
import { parseImageInput } from "@/lib/ai/parse"
import { getCurrentUser } from "@/lib/auth"

// Allow up to 20MB uploads (phone photos can be 5-10MB each)
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()

    // Support single "image" field or multiple "images" fields
    const files: File[] = []
    const singleFile = formData.get("image") as File | null
    if (singleFile) {
      files.push(singleFile)
    }
    const multiFiles = formData.getAll("images") as File[]
    files.push(...multiFiles)

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one image file is required" },
        { status: 400 }
      )
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]

    // Validate all files
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Images must be JPEG, PNG, WebP, or GIF" },
          { status: 400 }
        )
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Each image must be under 10MB" },
          { status: 400 }
        )
      }
    }

    // Convert all files to base64
    const base64Images: string[] = []
    const mimeTypes: string[] = []
    for (const file of files) {
      const bytes = await file.arrayBuffer()
      base64Images.push(Buffer.from(bytes).toString("base64"))
      mimeTypes.push(file.type)
    }

    // Single AI call handles all pages
    const result = await parseImageInput(
      base64Images.length === 1 ? base64Images[0] : base64Images,
      mimeTypes.length === 1 ? mimeTypes[0] : mimeTypes
    )

    return NextResponse.json({
      data: {
        items: result.items,
        rawInput: `[${files.length} image${files.length !== 1 ? "s" : ""}]`,
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
