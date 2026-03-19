import "dotenv/config"
import { parseTextInput } from "../src/lib/ai/parse"
import { readFileSync } from "fs"
import { join } from "path"

interface TestCase {
  rawText: string
  expectedProduct: string // Product name or "NO_MATCH"
  notes: string
}

interface TestResult {
  rawText: string
  expected: string
  actual: string | null
  confidence: number
  status: "PASS" | "FAIL" | "MISS" | "FALSE_POSITIVE"
  notes: string
}

async function run() {
  const casesPath = join(__dirname, "test-cases.json")
  const cases: TestCase[] = JSON.parse(readFileSync(casesPath, "utf-8"))

  console.log(`\n🧪 Running ${cases.length} matching test cases...\n`)
  console.log("─".repeat(120))

  const results: TestResult[] = []
  let pass = 0, fail = 0, miss = 0, falsePos = 0

  for (const tc of cases) {
    try {
      const matches = await parseTextInput(tc.rawText)
      const top = matches[0]

      const matchedName = top?.matchedProduct?.name ?? null
      const parsedName = top?.parsedItem?.name ?? null
      const confidence = top?.matchConfidence ?? 0
      const isPanel = !!top?.panelSpecs
      const expectNoMatch = tc.expectedProduct === "NO_MATCH"
      const expectPanel = tc.expectedProduct === "PANEL_MATCH"

      let status: TestResult["status"]

      if (expectPanel) {
        // Panel items should be detected as panels (non-catalog with panelSpecs)
        if (isPanel) {
          status = "PASS"
          pass++
        } else {
          status = "FAIL"
          fail++
        }
      } else if (expectNoMatch) {
        if (!matchedName || confidence < 0.50) {
          status = "PASS"
          pass++
        } else {
          status = "FALSE_POSITIVE"
          falsePos++
        }
      } else {
        // Normalize for comparison — check matched product name OR parsed name
        const expected = tc.expectedProduct.toLowerCase()
        const actual = (matchedName || "").toLowerCase()
        const parsed = (parsedName || "").toLowerCase()

        // Check if the matched product contains the key identifying words of the expected product
        const expectedKeywords = expected.split(/[\s\-\/(),"]+/).filter(w => w.length > 1)
        const significantKeywords = expectedKeywords.slice(0, 4)
        const keywordMatchCount = significantKeywords.filter(kw =>
          actual.includes(kw) || parsed.includes(kw)
        ).length
        const keywordMatchRatio = significantKeywords.length > 0 ? keywordMatchCount / significantKeywords.length : 0

        if (matchedName && keywordMatchRatio >= 0.6) {
          status = "PASS"
          pass++
        } else if (!matchedName && !isPanel) {
          status = "MISS"
          miss++
        } else {
          status = "FAIL"
          fail++
        }
      }

      const statusIcon = { PASS: "✅", FAIL: "❌", MISS: "⚠️", FALSE_POSITIVE: "🚨" }[status]
      console.log(`${statusIcon} ${status.padEnd(15)} | "${tc.rawText}"`)
      if (status !== "PASS") {
        console.log(`   Expected: ${tc.expectedProduct}`)
        console.log(`   Got:      ${matchedName ?? "NO_MATCH"} (conf: ${confidence.toFixed(2)})`)
      }

      results.push({
        rawText: tc.rawText,
        expected: tc.expectedProduct,
        actual: matchedName,
        confidence,
        status,
        notes: tc.notes,
      })
    } catch (err) {
      console.log(`💥 ERROR        | "${tc.rawText}" — ${err instanceof Error ? err.message : err}`)
      results.push({
        rawText: tc.rawText,
        expected: tc.expectedProduct,
        actual: null,
        confidence: 0,
        status: "FAIL",
        notes: `ERROR: ${err instanceof Error ? err.message : err}`,
      })
      fail++
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log("\n" + "─".repeat(120))
  console.log(`\n📊 RESULTS: ${cases.length} tests`)
  console.log(`   ✅ PASS:           ${pass}`)
  console.log(`   ❌ FAIL:           ${fail} (wrong product matched)`)
  console.log(`   ⚠️  MISS:           ${miss} (should have matched but didn't)`)
  console.log(`   🚨 FALSE_POSITIVE: ${falsePos} (matched but should be NO_MATCH)`)
  console.log(`   Accuracy:         ${((pass / cases.length) * 100).toFixed(1)}%`)
  console.log()

  // Show all failures
  const failures = results.filter((r) => r.status !== "PASS")
  if (failures.length > 0) {
    console.log("─── FAILURES ───")
    for (const f of failures) {
      console.log(`\n  "${f.rawText}" (${f.notes})`)
      console.log(`    Expected: ${f.expected}`)
      console.log(`    Got:      ${f.actual ?? "NO_MATCH"} (conf: ${f.confidence.toFixed(2)})`)
      console.log(`    Status:   ${f.status}`)
    }
  }
}

run().catch(console.error)
