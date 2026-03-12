import { NextRequest, NextResponse } from "next/server"
import { parseTextInput, parseReceivingTextInput } from "@/lib/ai/parse"
import { getCurrentUser } from "@/lib/auth"
import type { ParseResult, ReceivingParseResult } from "@/lib/ai/types"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { text, context } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text input is required" },
        { status: 400 }
      )
    }

    // Receiving context: also extract supplier/PO info from text
    if (context === "receiving") {
      const result = await parseReceivingTextInput(text)

      const data: ReceivingParseResult = {
        items: result.items,
        rawInput: text,
        inputType: "text",
        supplier: result.supplier,
        supplierId: result.supplierId,
        poNumber: result.poNumber,
        poId: result.poId,
        deliveryDate: result.deliveryDate,
      }

      return NextResponse.json({ data })
    }

    // Default: items only (BOM, quick add)
    const matchedItems = await parseTextInput(text)

    const result: ParseResult = {
      items: matchedItems,
      rawInput: text,
      inputType: "text",
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("[parse] Error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
