import { test, expect, Page } from "@playwright/test"

// ─── Helpers ─────────────────────────────────────────────────────────

/** Navigate to BOM manual entry page */
async function goToManualBom(page: Page) {
  await page.goto("/boms/new?tab=manual")
  await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })
  // Wait for manual form — has "Job *" heading and "Search catalog" input
  await expect(page.getByPlaceholder(/search catalog/i)).toBeVisible({ timeout: 5_000 })
}

/** Get the AIInput text field */
function getAIInput(page: Page) {
  return page.getByPlaceholder(/search catalog/i)
}

/** Type into AIInput and wait for dropdown results */
async function searchAndWaitForDropdown(page: Page, term: string): Promise<boolean> {
  const input = getAIInput(page)
  await input.fill(term)
  // Wait for debounce (250ms) + API response
  await page.waitForTimeout(3_000)

  // Look for dropdown results — they're buttons inside a z-50 dropdown
  const result = page.locator("[class*='z-50'] button").first()
  return await result.isVisible({ timeout: 5_000 }).catch(() => false)
}

// ═══════════════════════════════════════════════════════════════════
// GROUP 1: LIVE CATALOG SEARCH
// ═══════════════════════════════════════════════════════════════════

test.describe("1. Live Catalog Search", () => {

  test("1.1 Typing shows catalog search results dropdown", async ({ page }) => {
    await goToManualBom(page)

    const terms = ["froth", "panel", "screw", "insulation", "caulk", "tape", "hinge"]
    let found = false
    for (const term of terms) {
      found = await searchAndWaitForDropdown(page, term)
      if (found) break
    }

    expect(found).toBe(true)
  })

  test("1.2 Clicking a search result adds the product", async ({ page }) => {
    await goToManualBom(page)

    const input = getAIInput(page)
    const terms = ["froth", "panel", "screw", "insulation", "caulk", "tape", "hinge"]
    let productFound = false

    for (const term of terms) {
      await input.fill(term)
      await page.waitForTimeout(3_000)
      const result = page.locator("[class*='z-50'] button").first()
      if (await result.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await result.click()
        await page.waitForTimeout(500)

        // Input should be cleared after selection
        await expect(input).toHaveValue("")
        productFound = true
        break
      }
    }

    if (!productFound) {
      test.skip(true, "No catalog products found for any search term")
    }
  })

  test("1.3 Short text (< 2 chars) does not trigger search", async ({ page }) => {
    await goToManualBom(page)

    const input = getAIInput(page)
    await input.fill("a")
    await page.waitForTimeout(1_500)

    const dropdown = page.locator("[class*='z-50'] button").first()
    await expect(dropdown).not.toBeVisible({ timeout: 2_000 })
  })

  test("1.4 Search with no matches shows no dropdown", async ({ page }) => {
    await goToManualBom(page)

    const input = getAIInput(page)
    await input.fill("xyznonexistent99999")
    await page.waitForTimeout(2_000)

    const dropdown = page.locator("[class*='z-50'] button").first()
    await expect(dropdown).not.toBeVisible({ timeout: 2_000 })
  })

  test("1.5 Clicking outside closes dropdown", async ({ page }) => {
    await goToManualBom(page)

    const terms = ["froth", "panel", "screw", "caulk", "tape"]
    let dropdownVisible = false
    for (const term of terms) {
      dropdownVisible = await searchAndWaitForDropdown(page, term)
      if (dropdownVisible) break
    }

    if (!dropdownVisible) {
      test.skip(true, "No catalog products found — cannot test close")
      return
    }

    // Click elsewhere to close
    await page.locator("h3").filter({ hasText: "Job" }).click()
    await page.waitForTimeout(500)

    const dropdown = page.locator("[class*='z-50'] button").first()
    await expect(dropdown).not.toBeVisible({ timeout: 2_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 2: AI TEXT PARSING
// ═══════════════════════════════════════════════════════════════════

test.describe("2. AI Text Parsing", () => {

  test("2.1 Sending text triggers AI parse and adds items", async ({ page }) => {
    await goToManualBom(page)

    const input = getAIInput(page)
    await input.fill("2 tubes caulk")

    // Click send button
    const sendBtn = page.locator("button svg.lucide-send").locator("..")
    await sendBtn.click()

    // Wait for processing to complete — look for items to appear or "Added" toast
    await page.waitForFunction(() => {
      const body = document.body.innerText
      return body.includes("Items (") && !body.includes("Items (0)") || body.includes("Added")
    }, { timeout: 60_000 })
  })

  test("2.2 Empty text does not trigger parse", async ({ page }) => {
    await goToManualBom(page)

    const input = getAIInput(page)
    await input.fill("")
    await input.press("Enter")
    await page.waitForTimeout(2_000)

    // Should still show Items (0)
    await expect(page.getByText("Items (0)")).toBeVisible()
  })

  test("2.3 Enter key sends to AI parse", async ({ page }) => {
    await goToManualBom(page)

    const input = getAIInput(page)
    await input.fill("5 boxes of screws")
    await input.press("Enter")

    // Wait for AI to process
    await page.waitForFunction(() => {
      const body = document.body.innerText
      return body.includes("Processing...") ||
        (body.includes("Items (") && !body.includes("Items (0)")) ||
        body.includes("Added")
    }, { timeout: 60_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 3: BOM TEMPLATES
// ═══════════════════════════════════════════════════════════════════

test.describe("3. BOM Templates", () => {

  test("3.1 Template create page has unified search input", async ({ page }) => {
    await page.goto("/bom-templates/new")
    await expect(page.getByRole("heading", { name: /new template/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByPlaceholder(/search catalog/i)).toBeVisible()
  })

  test("3.2 Template search finds and adds catalog product", async ({ page }) => {
    await page.goto("/bom-templates/new")
    await expect(page.getByRole("heading", { name: /new template/i })).toBeVisible({ timeout: 10_000 })

    await page.getByLabel(/template name/i).fill(`E2E Template ${Date.now()}`)

    const input = page.getByPlaceholder(/search catalog/i)
    const terms = ["froth", "panel", "screw", "insulation", "caulk", "tape"]
    let productFound = false

    for (const term of terms) {
      await input.fill(term)
      await page.waitForTimeout(3_000)
      const result = page.locator("[class*='z-50'] button").first()
      if (await result.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await result.click()
        await page.waitForTimeout(500)
        productFound = true
        break
      }
    }

    if (!productFound) {
      test.skip(true, "No catalog products found")
      return
    }

    const submitBtn = page.getByRole("button", { name: /create template/i })
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 4: PAGE STABILITY
// ═══════════════════════════════════════════════════════════════════

test.describe("4. Page Stability", () => {

  test("4.1 Pages load without console errors", async ({ page }) => {
    const criticalErrors: string[] = []
    page.on("pageerror", (err) => {
      if (err.message.includes("Hydration")) return
      criticalErrors.push(err.message)
    })

    await page.goto("/boms/new?tab=manual")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(2_000)

    await page.goto("/bom-templates/new")
    await expect(page.getByRole("heading", { name: /new template/i })).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(2_000)

    await page.goto("/receiving")
    await page.waitForTimeout(3_000)

    expect(criticalErrors).toEqual([])
  })
})
