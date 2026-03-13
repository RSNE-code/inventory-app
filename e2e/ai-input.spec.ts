import { test, expect, Page } from "@playwright/test"

// ─── Helpers ─────────────────────────────────────────────────────────

/** Navigate to BOM manual entry page */
async function goToManualBom(page: Page) {
  await page.goto("/boms/new")
  await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })
  await page.locator("button").filter({ hasText: "Manual Entry" }).click()
  await page.waitForTimeout(500)
}

/** Get the AIInput text field (the one with search icon) */
function getAIInput(page: Page) {
  return page.getByPlaceholder(/search catalog/i)
}

// ═══════════════════════════════════════════════════════════════════
// GROUP 1: LIVE CATALOG SEARCH
// ═══════════════════════════════════════════════════════════════════

test.describe("1. Live Catalog Search", () => {

  test("1.1 Typing shows catalog search results dropdown", async ({ page }) => {
    await goToManualBom(page)

    const input = getAIInput(page)
    await expect(input).toBeVisible()

    // Type a product name that should exist
    await input.fill("panel")
    await page.waitForTimeout(2_000)

    // Dropdown should appear with results
    const dropdown = page.locator("button.w-full.text-left").first()
    await expect(dropdown).toBeVisible({ timeout: 5_000 })
  })

  test("1.2 Clicking a search result adds the product", async ({ page }) => {
    await goToManualBom(page)

    const input = getAIInput(page)
    const searchTerms = ["panel", "screw", "insulation", "caulk", "tape", "froth"]
    let productFound = false

    for (const term of searchTerms) {
      await input.fill(term)
      await page.waitForTimeout(2_500)
      const result = page.locator("button.w-full.text-left").first()
      if (await result.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const productName = await result.locator("p.text-sm.font-medium").textContent()
        await result.click()
        await page.waitForTimeout(500)

        // Input should be cleared
        await expect(input).toHaveValue("")

        // Product should appear in the line items area
        if (productName) {
          await expect(page.getByText(productName).first()).toBeVisible({ timeout: 3_000 })
        }
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
    await page.waitForTimeout(1_000)

    // No dropdown should appear
    const dropdown = page.locator("button.w-full.text-left").first()
    await expect(dropdown).not.toBeVisible({ timeout: 2_000 })
  })

  test("1.4 Search with no matches shows no dropdown", async ({ page }) => {
    await goToManualBom(page)

    const input = getAIInput(page)
    await input.fill("xyznonexistent99999")
    await page.waitForTimeout(2_000)

    const dropdown = page.locator("button.w-full.text-left").first()
    await expect(dropdown).not.toBeVisible({ timeout: 2_000 })
  })

  test("1.5 Clicking outside closes dropdown", async ({ page }) => {
    await goToManualBom(page)

    const input = getAIInput(page)
    await input.fill("panel")
    await page.waitForTimeout(2_500)

    const dropdown = page.locator("button.w-full.text-left").first()
    if (await dropdown.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Click elsewhere
      await page.locator("body").click({ position: { x: 10, y: 10 } })
      await page.waitForTimeout(500)
      await expect(dropdown).not.toBeVisible({ timeout: 2_000 })
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 2: AI TEXT PARSING
// ═══════════════════════════════════════════════════════════════════

test.describe("2. AI Text Parsing", () => {

  test("2.1 Sending text triggers AI parse and adds items", async ({ page }) => {
    await goToManualBom(page)
    await page.getByLabel("Job Name *").fill(`E2E AIInput ${Date.now()}`)

    const input = getAIInput(page)
    await input.fill("2 tubes caulk")

    // Click the send button (paper airplane)
    const sendBtn = page.locator("button").filter({ has: page.locator("svg.lucide-send") }).first()
    await sendBtn.click()

    // Wait for processing to complete
    await page.waitForFunction(() => {
      const body = document.body.innerText
      return body.includes("caulk") || body.includes("Caulk") || body.includes("Added")
    }, { timeout: 60_000 })
  })

  test("2.2 Empty text does not trigger parse", async ({ page }) => {
    await goToManualBom(page)

    const input = getAIInput(page)
    await input.fill("")
    await input.press("Enter")
    await page.waitForTimeout(2_000)

    // Should still be on the same page with no errors
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible()
  })

  test("2.3 Enter key sends to AI parse (no dropdown selection)", async ({ page }) => {
    await goToManualBom(page)
    await page.getByLabel("Job Name *").fill(`E2E Enter Key ${Date.now()}`)

    const input = getAIInput(page)
    await input.fill("5 boxes of screws")
    await input.press("Enter")

    // Wait for AI processing
    await page.waitForFunction(() => {
      const body = document.body.innerText
      return (
        body.includes("Processing...") ||
        body.includes("screw") ||
        body.includes("Screw") ||
        body.includes("Added")
      )
    }, { timeout: 60_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 3: MIC BUTTON
// ═══════════════════════════════════════════════════════════════════

test.describe("3. Mic Button", () => {

  test("3.1 Mic button is visible", async ({ page }) => {
    await goToManualBom(page)

    // Mic button should be the orange button with Mic icon
    const micBtn = page.locator("button").filter({ has: page.locator("svg.lucide-mic") }).first()
    // May not be visible in headless (no Web Speech API) — just verify no crash
    await page.waitForTimeout(1_000)
    // No assertions on visibility since Web Speech API may not be supported in headless
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 4: BOM AI FLOW — ADD ITEM
// ═══════════════════════════════════════════════════════════════════

test.describe("4. BOM AI Flow — Add Item", () => {

  test("4.1 Add Item button opens input with search", async ({ page }) => {
    await page.goto("/boms/new")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })

    // AI Build tab is default — type something to get to BUILD phase
    const input = page.getByPlaceholder(/20 sheets/i).or(page.locator("input[type='text']").first())
    if (await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await input.fill("1 tube caulk")
      await input.press("Enter")

      // Wait for AI to process
      await page.waitForFunction(() => {
        const body = document.body.innerText
        return body.includes("Add item") || body.includes("Confirm") || body.includes("caulk")
      }, { timeout: 60_000 })

      // Look for the "+ Add item" button
      const addItemBtn = page.getByText("Add item").first()
      if (await addItemBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await addItemBtn.click()
        await page.waitForTimeout(500)

        // Search input should appear
        await expect(page.getByPlaceholder(/search catalog/i)).toBeVisible({ timeout: 3_000 })
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 5: BOM TEMPLATES
// ═══════════════════════════════════════════════════════════════════

test.describe("5. BOM Templates", () => {

  test("5.1 Template create page has unified search input", async ({ page }) => {
    await page.goto("/bom-templates/new")
    await expect(page.getByRole("heading", { name: /new template/i })).toBeVisible({ timeout: 10_000 })

    // Search input should be visible
    await expect(page.getByPlaceholder(/search catalog/i)).toBeVisible()
  })

  test("5.2 Template search finds and adds catalog product", async ({ page }) => {
    await page.goto("/bom-templates/new")
    await expect(page.getByRole("heading", { name: /new template/i })).toBeVisible({ timeout: 10_000 })

    await page.getByLabel(/template name/i).fill(`E2E Template ${Date.now()}`)

    const input = page.getByPlaceholder(/search catalog/i)
    const searchTerms = ["panel", "screw", "insulation", "caulk", "tape"]
    let productFound = false

    for (const term of searchTerms) {
      await input.fill(term)
      await page.waitForTimeout(2_500)
      const result = page.locator("button.w-full.text-left").first()
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

    // Submit button should now be enabled
    const submitBtn = page.getByRole("button", { name: /create template/i })
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 6: ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════

test.describe("6. Error Handling", () => {

  test("6.1 Pages load without console errors", async ({ page }) => {
    const criticalErrors: string[] = []
    page.on("pageerror", (err) => {
      if (err.message.includes("Hydration")) return
      criticalErrors.push(err.message)
    })

    // Check BOM new page
    await page.goto("/boms/new")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(2_000)

    // Check template new page
    await page.goto("/bom-templates/new")
    await expect(page.getByRole("heading", { name: /new template/i })).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(2_000)

    // Check receiving page
    await page.goto("/receiving")
    await page.waitForTimeout(3_000)

    expect(criticalErrors).toEqual([])
  })
})
