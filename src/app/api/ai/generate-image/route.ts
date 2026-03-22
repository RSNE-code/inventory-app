import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { generateProductImage } from "@/lib/ai/generate-image"
import { createClient } from "@/lib/supabase/server"

const requestSchema = z.object({
  productId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productId } = requestSchema.parse(body)

    // Fetch product details for prompt context
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Build dimensions string if available
    const dims = [
      product.dimThickness && `${product.dimThickness}${product.dimThicknessUnit || '"'}`,
      product.dimLength && `${product.dimLength}${product.dimLengthUnit || "'"}`,
      product.dimWidth && `${product.dimWidth}${product.dimWidthUnit || '"'}`,
    ]
      .filter(Boolean)
      .join(" × ")

    // Generate image via Nano Banana 2
    const { imageData, mimeType } = await generateProductImage(
      product.name,
      product.category?.name,
      dims || null
    )

    // Upload to Supabase Storage
    const ext = mimeType === "image/png" ? "png" : "jpg"
    const fileName = `product-images/${productId}.${ext}`

    const supabase = await createClient()
    const { error: uploadError } = await supabase.storage
      .from("inventory")
      .upload(fileName, imageData, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadError) {
      // If bucket doesn't exist, return the image as base64 and store URL as data URI
      console.warn("Supabase storage upload failed:", uploadError.message)
      const dataUri = `data:${mimeType};base64,${imageData.toString("base64")}`

      await prisma.product.update({
        where: { id: productId },
        data: { imageUrl: dataUri },
      })

      return NextResponse.json({
        data: { imageUrl: dataUri, source: "inline" },
      })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("inventory")
      .getPublicUrl(fileName)

    const imageUrl = urlData.publicUrl

    // Save URL to product record
    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl },
    })

    return NextResponse.json({
      data: { imageUrl, source: "storage" },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.issues },
        { status: 400 }
      )
    }
    console.error("[generate-image] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate image" },
      { status: 500 }
    )
  }
}
