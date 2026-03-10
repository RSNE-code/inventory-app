import { NextRequest, NextResponse } from "next/server"
import { parseTextInput } from "@/lib/ai/parse"
import { matchItemsToCatalog } from "@/lib/ai/catalog-match"
import { getCurrentUser } from "@/lib/auth"
import type { ParseResult } from "@/lib/ai/types"

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { text } = await request.json()

  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "Text input is required" },
      { status: 400 }
    )
  }

  const parsedItems = await parseTextInput(text)
  const matchedItems = await matchItemsToCatalog(parsedItems)

  const result: ParseResult = {
    items: matchedItems,
    rawInput: text,
    inputType: "text",
  }

  return NextResponse.json({ data: result })
}
