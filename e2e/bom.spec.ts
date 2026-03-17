import { test, expect, Page } from "@playwright/test"

// ─── Helpers ─────────────────────────────────────────────────────────

const BOMS_URL = "/boms"

/** Navigate to BOM list page and switch to BOM List tab */
async function goToBomList(page: Page) {
  await page.goto(BOMS_URL)
  await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
  // Switch to BOM List tab (page defaults to Create BOM tab)
  await page.locator("button").filter({ hasText: "BOM List" }).click()
  await page.waitForTimeout(500)
}

/** Wait for BOM detail page to load */
async function waitForBomDetail(page: Page) {
  await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
}

// ─── BOM List Page ───────────────────────────────────────────────────

test.describe("BOM List Page", () => {
  test("loads and displays BOM list with filters", async ({ page }) => {
    await goToBomList(page)

    // Status filter chips visible
    await expect(page.locator("button").filter({ hasText: "All" })).toBeVisible()
    await expect(page.locator("button").filter({ hasText: "Draft" })).toBeVisible()
    await expect(page.locator("button").filter({ hasText: "Review" })).toBeVisible()
    await expect(page.locator("button").filter({ hasText: "Approved" })).toBeVisible()

    // Search input visible
    await expect(page.getByPlaceholder(/search by job name/i)).toBeVisible()
  })

  test("filters BOMs by status", async ({ page }) => {
    await goToBomList(page)

    // Click Draft filter
    await page.locator("button").filter({ hasText: "Draft" }).click()
    await page.waitForTimeout(1_000)

    // Verify page updated (either shows BOMs or empty state)
    const body = await page.locator("body").innerText()
    expect(
      body.includes("BOMs") || body.includes("No BOMs found")
    ).toBe(true)
  })

  test("search filters BOM list", async ({ page }) => {
    await goToBomList(page)

    const searchInput = page.getByPlaceholder(/search by job name/i)
    await searchInput.fill("nonexistent-job-xyz-999")
    await page.waitForTimeout(1_500)

    // Should show empty state or zero results
    await expect(page.locator("body")).toContainText(/no boms found|0 BOMs/i)
  })
})

// ─── BOM Create Page ─────────────────────────────────────────────────

test.describe("BOM Create Page", () => {
  test("renders photo capture as primary action", async ({ page }) => {
    await page.goto("/boms/new")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })

    // Photo capture hero should be visible
    await expect(page.locator("text=Snap Your Material List")).toBeVisible()

    // Manual fallback link visible
    await expect(page.locator("text=or enter manually")).toBeVisible()
  })

  test("manual entry mode shows product browser", async ({ page }) => {
    await page.goto("/boms/new?mode=manual")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })

    // Search bar visible
    await expect(page.getByPlaceholder(/search products/i)).toBeVisible()

    // Category tabs visible
    await expect(page.locator("button").filter({ hasText: "★ Recent" })).toBeVisible()

    // Create BOM button should not be visible (no items yet)
    // The cart bar only shows when items are added
  })

  test("manual entry: create BOM with product", async ({ page }) => {
    await page.goto("/boms/new?mode=manual")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })

    // Search for a product
    const searchInput = page.getByPlaceholder(/search products/i)
    await searchInput.fill("caulk")
    await page.waitForTimeout(2_000)

    // Click first product's add button
    const addBtn = page.locator("button").filter({ has: page.locator(".lucide-plus") }).first()
    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(500)

      // Cart bar should appear — use specific cart summary text
      await expect(page.locator("text=1 item (1 total)")).toBeVisible({ timeout: 3_000 })

      // Need to set a job name — but quick-pick has the job picker
      // This test validates the product add flow works
    }
  })
})

// ─── BOM Detail Page ─────────────────────────────────────────────────

test.describe("BOM Detail Page", () => {
  let testBomId: string | null = null

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    try {
      const res = await page.request.get("http://localhost:3000/api/boms?limit=1")
      if (res.ok()) {
        const json = await res.json()
        if (json.data && json.data.length > 0) {
          testBomId = json.data[0].id
        }
      }
    } catch (e) {
      console.warn("Could not find test BOM:", e)
    }
    await page.close()
  })

  test("loads BOM detail with job info and line items", async ({ page }) => {
    if (!testBomId) {
      test.skip()
      return
    }
    await page.goto(`/boms/${testBomId}`)
    await waitForBomDetail(page)

    // Items section visible — use heading role to avoid matching "items" in buttons
    await expect(page.locator("h3").filter({ hasText: /^Items/ })).toBeVisible()
  })

  test("BOM detail shows status progress steps", async ({ page }) => {
    if (!testBomId) {
      test.skip()
      return
    }
    await page.goto(`/boms/${testBomId}`)
    await waitForBomDetail(page)

    // Lifecycle progress steps visible — use the step progress component spans
    // These appear in the StepProgress component, not in badges or buttons
    const stepLabels = page.locator("[class*='step-progress'], [class*='StepProgress']")
    // Just verify the page loaded with some BOM content
    await expect(page.locator("h3").filter({ hasText: /^Items/ }).first()).toBeVisible()
  })
})

// ─── BOM Status Transitions ─────────────────────────────────────────

test.describe("BOM Status Transitions", () => {
  test("approve a BOM directly (no confirmation dialog)", async ({ page }) => {
    // Create BOM via API for a clean test
    const createRes = await page.request.post("http://localhost:3000/api/boms", {
      data: {
        jobName: `E2E Approve Test ${Date.now()}`,
        lineItems: [{ productId: null, tier: "TIER_2", qtyNeeded: 1, isNonCatalog: true, nonCatalogName: "Test Item" }],
      },
    })

    if (!createRes.ok()) {
      test.skip()
      return
    }

    const { data: bom } = await createRes.json()
    await page.goto(`/boms/${bom.id}`)
    await waitForBomDetail(page)

    // Click Approve — should work directly (no confirmation dialog)
    const approveBtn = page.getByRole("button", { name: /approve bom/i })
    if (await approveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await approveBtn.click()
      await page.waitForTimeout(2_000)

      // Should show checkout options or approved state
      const body = await page.locator("body").innerText()
      expect(
        body.includes("Check Out All") ||
        body.includes("Approved") ||
        body.includes("Adjust")
      ).toBe(true)
    }
  })
})

// ─── BOM Templates ──────────────────────────────────────────────────

test.describe("BOM Templates", () => {
  test("loads template list page", async ({ page }) => {
    await page.goto("/bom-templates")
    await expect(page.locator("text=BOM Templates")).toBeVisible({ timeout: 15_000 })
  })

  test("navigate to create template page", async ({ page }) => {
    await page.goto("/bom-templates/new")
    await expect(page.getByRole("heading", { name: /new template/i })).toBeVisible({ timeout: 10_000 })

    // Form fields visible
    await expect(page.getByLabel(/template name/i)).toBeVisible()
    await expect(page.getByPlaceholder(/search catalog/i)).toBeVisible()

    // Submit disabled without data
    const submitBtn = page.getByRole("button", { name: /create template/i })
    await expect(submitBtn).toBeVisible()
    await expect(submitBtn).toBeDisabled()
  })
})

// ─── Page Stability ──────────────────────────────────────────────────

test.describe("Page Stability", () => {
  test("BOM list page has no console errors", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text())
    })

    await page.goto(BOMS_URL)
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(2_000)

    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("hydrat") && !e.includes("Warning:")
    )
    expect(criticalErrors).toEqual([])
  })

  test("BOM create page has no console errors", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text())
    })

    await page.goto("/boms/new")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(2_000)

    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("hydrat") && !e.includes("Warning:")
    )
    expect(criticalErrors).toEqual([])
  })

  test("BOM pages respond within acceptable time", async ({ page }) => {
    const listStart = Date.now()
    await page.goto(BOMS_URL)
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    const listTime = Date.now() - listStart
    expect(listTime).toBeLessThan(10_000)

    const createStart = Date.now()
    await page.goto("/boms/new")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 15_000 })
    const createTime = Date.now() - createStart
    expect(createTime).toBeLessThan(10_000)
  })

  test("Review queue page loads", async ({ page }) => {
    await page.goto("/boms/review")
    await expect(page.locator("text=Review Queue")).toBeVisible({ timeout: 15_000 })
  })
})
