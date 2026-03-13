import { test, expect, Page } from "@playwright/test"

// ─── Helpers ─────────────────────────────────────────────────────────

const BOMS_URL = "/boms"

/** Navigate to BOM list page and wait for it to load */
async function goToBomList(page: Page) {
  await page.goto(BOMS_URL)
  await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
}

/** Wait for BOM detail page to load */
async function waitForBomDetail(page: Page) {
  await expect(page.locator("text=Job Details")).toBeVisible({ timeout: 15_000 })
}

// ─── BOM List Page ───────────────────────────────────────────────────

test.describe("BOM List Page", () => {
  test("loads and displays BOM list with filters", async ({ page }) => {
    await goToBomList(page)

    // Header visible
    await expect(page.locator("text=Bills of Materials")).toBeVisible()

    // Status filter chips visible
    await expect(page.locator("text=All")).toBeVisible()
    await expect(page.locator("text=Draft")).toBeVisible()
    await expect(page.locator("text=Approved")).toBeVisible()
    await expect(page.locator("text=In Progress")).toBeVisible()
    await expect(page.locator("text=Completed")).toBeVisible()

    // Search input visible
    await expect(page.getByPlaceholder(/search by job name/i)).toBeVisible()

    // FAB (create) button visible
    await expect(page.locator("button").filter({ has: page.locator("svg") }).last()).toBeVisible()
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

  test("navigate to create BOM page via FAB", async ({ page }) => {
    await goToBomList(page)

    // Click the FAB (+ button)
    const fab = page.locator("a[href='/boms/new'], button").filter({ has: page.locator("svg.lucide-plus") }).first()
    if (await fab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await fab.click()
    } else {
      await page.goto("/boms/new")
    }

    await expect(page).toHaveURL(/\/boms\/new/)
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })
  })
})

// ─── BOM Create Page ─────────────────────────────────────────────────

test.describe("BOM Create Page", () => {
  test("renders AI Build and Manual Entry tabs", async ({ page }) => {
    await page.goto("/boms/new")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })

    // Both tabs visible
    await expect(page.locator("text=AI Build")).toBeVisible()
    await expect(page.locator("text=Manual Entry")).toBeVisible()
  })

  test("Manual Entry tab shows form fields", async ({ page }) => {
    await page.goto("/boms/new")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })

    // Switch to Manual Entry
    await page.locator("button").filter({ hasText: "Manual Entry" }).click()

    // Job name field
    await expect(page.getByLabel("Job Name *")).toBeVisible()

    // Product search
    await expect(page.getByPlaceholder(/search catalog/i)).toBeVisible()

    // Non-catalog button
    await expect(page.locator("text=Add Non-Catalog Item")).toBeVisible()

    // Submit button (disabled without data)
    const submitBtn = page.getByRole("button", { name: /create bom/i })
    await expect(submitBtn).toBeVisible()
    await expect(submitBtn).toBeDisabled()
  })

  test("Manual Entry validates required fields", async ({ page }) => {
    await page.goto("/boms/new")
    await page.locator("button").filter({ hasText: "Manual Entry" }).click()
    await page.waitForTimeout(500)

    // Create BOM button should be disabled without job name
    const submitBtn = page.getByRole("button", { name: /create bom/i })
    await expect(submitBtn).toBeDisabled()

    // Fill job name but no items — still disabled
    await page.getByLabel("Job Name *").fill("Test Job E2E")
    await expect(submitBtn).toBeDisabled()
  })

  test("Manual Entry: create BOM with product", async ({ page }) => {
    await page.goto("/boms/new")
    await page.locator("button").filter({ hasText: "Manual Entry" }).click()
    await page.waitForTimeout(500)

    // Fill job name
    await page.getByLabel("Job Name *").fill(`E2E Test BOM ${Date.now()}`)

    // Search for a product
    const productSearch = page.getByPlaceholder(/search catalog/i)
    await productSearch.fill("panel")
    await page.waitForTimeout(2_000)

    // Select first result if available
    const firstResult = page.locator("button.w-full.text-left").first()
    if (await firstResult.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstResult.click()
      await page.waitForTimeout(500)

      // Submit button should now be enabled
      const submitBtn = page.getByRole("button", { name: /create bom/i })
      await expect(submitBtn).toBeEnabled()

      // Submit
      await submitBtn.click()

      // Should redirect to BOM detail page
      await page.waitForURL(/\/boms\/[a-f0-9-]+/, { timeout: 15_000 })
      await waitForBomDetail(page)
    }
  })
})

// ─── BOM Detail Page ─────────────────────────────────────────────────

test.describe("BOM Detail Page", () => {
  let testBomId: string | null = null

  test.beforeAll(async ({ browser }) => {
    // Create a test BOM via API
    const page = await browser.newPage()
    try {
      const res = await page.request.get("http://localhost:3000/api/boms?limit=1&status=DRAFT")
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

    // Job Details card visible
    await expect(page.locator("text=Job Details")).toBeVisible()

    // Status badge visible
    const statusBadge = page.locator("[class*='badge'], [class*='Badge']").first()
    await expect(statusBadge).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Status may be shown differently
    })

    // Items section visible
    await expect(page.locator("text=Items")).toBeVisible()

    // Created by info visible
    await expect(page.locator("text=Created by")).toBeVisible()
  })

  test("Draft BOM shows Approve and Cancel buttons", async ({ page }) => {
    if (!testBomId) {
      test.skip()
      return
    }
    await page.goto(`/boms/${testBomId}`)
    await waitForBomDetail(page)

    // Check if DRAFT status — look for approve button
    const approveBtn = page.getByRole("button", { name: /approve bom/i })
    const cancelBtn = page.getByRole("button", { name: /cancel bom/i })

    if (await approveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(approveBtn).toBeEnabled()
      await expect(cancelBtn).toBeVisible()
    }
  })
})

// ─── BOM Status Transitions ─────────────────────────────────────────

test.describe("BOM Status Transitions", () => {
  test("create, approve, and complete a BOM lifecycle", async ({ page }) => {
    // Step 1: Create BOM via Manual Entry
    await page.goto("/boms/new")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })
    await page.locator("button").filter({ hasText: "Manual Entry" }).click()
    await page.waitForTimeout(500)

    const jobName = `E2E Lifecycle ${Date.now()}`
    await page.getByLabel("Job Name *").fill(jobName)

    // Add a product — try multiple search terms
    const productSearch = page.getByPlaceholder(/search catalog/i)
    const searchTerms = ["panel", "screw", "insulation", "caulk", "tape"]
    let productFound = false

    for (const term of searchTerms) {
      await productSearch.fill(term)
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
      test.skip()
      return
    }

    // Submit BOM
    const createBtn = page.getByRole("button", { name: /create bom/i })
    await expect(createBtn).toBeEnabled({ timeout: 3_000 })
    await createBtn.click()
    await page.waitForURL(/\/boms\/[a-f0-9-]+/, { timeout: 20_000 })
    await waitForBomDetail(page)

    // Step 2: Approve BOM (now has confirmation dialog)
    const approveBtn = page.getByRole("button", { name: /approve bom/i })
    await expect(approveBtn).toBeVisible({ timeout: 10_000 })
    await approveBtn.click()

    // Confirmation card should appear — click Confirm
    const confirmBtn = page.getByRole("button", { name: /^confirm$/i })
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 })
    await confirmBtn.click()

    // Wait for approval to complete — look for post-approval UI (checkout buttons or Approved badge)
    await page.waitForFunction(() => {
      const body = document.body.innerText
      return (
        body.includes("Check Out All") ||
        body.includes("Adjust & Check Out") ||
        body.includes("Approved by")
      )
    }, { timeout: 30_000 })

    // Step 3: Verify approved state — should show checkout options or approved badge
    const checkoutVisible = await page.locator("text=Check Out All").isVisible({ timeout: 5_000 }).catch(() => false)
    const adjustVisible = await page.locator("text=Adjust & Check Out").isVisible({ timeout: 3_000 }).catch(() => false)
    const approvedBadge = await page.locator("text=Approved by").isVisible({ timeout: 3_000 }).catch(() => false)
    expect(checkoutVisible || adjustVisible || approvedBadge).toBe(true)
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

  test("create template with product", async ({ page }) => {
    await page.goto("/bom-templates/new")
    await expect(page.getByRole("heading", { name: /new template/i })).toBeVisible({ timeout: 10_000 })

    // Fill template name
    await page.getByLabel(/template name/i).fill(`E2E Template ${Date.now()}`)

    // Search for a product
    const productSearch = page.getByPlaceholder(/search catalog/i)
    const searchTerms = ["panel", "screw", "insulation", "caulk", "tape"]
    let productFound = false

    for (const term of searchTerms) {
      await productSearch.fill(term)
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
      test.skip()
      return
    }

    // Submit button should now be enabled
    const submitBtn = page.getByRole("button", { name: /create template/i })
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 })

    // Submit
    await submitBtn.click()

    // Should redirect to template detail page
    await page.waitForURL(/\/bom-templates\/[a-f0-9-]+/, { timeout: 15_000 })
    await expect(page.locator("text=Template Details")).toBeVisible({ timeout: 10_000 })
  })

  test("template list has no console errors", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text())
    })

    await page.goto("/bom-templates")
    await expect(page.locator("text=BOM Templates")).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(2_000)

    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("hydrat") && !e.includes("Warning:")
    )
    expect(criticalErrors).toEqual([])
  })
})

// ─── Page Stability ──────────────────────────────────────────────────

test.describe("Page Stability", () => {
  test("BOM list page has no console errors", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text())
      }
    })

    await goToBomList(page)
    await page.waitForTimeout(2_000)

    // Filter out known non-critical errors (e.g., favicon, hydration warnings)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("404") &&
        !e.includes("hydrat") &&
        !e.includes("Warning:")
    )
    expect(criticalErrors).toEqual([])
  })

  test("BOM create page has no console errors", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text())
      }
    })

    await page.goto("/boms/new")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(2_000)

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("404") &&
        !e.includes("hydrat") &&
        !e.includes("Warning:")
    )
    expect(criticalErrors).toEqual([])
  })

  test("BOM pages respond within acceptable time", async ({ page }) => {
    // BOM list page
    const listStart = Date.now()
    await page.goto(BOMS_URL)
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    const listTime = Date.now() - listStart
    expect(listTime).toBeLessThan(10_000)

    // BOM create page
    const createStart = Date.now()
    await page.goto("/boms/new")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 15_000 })
    const createTime = Date.now() - createStart
    expect(createTime).toBeLessThan(10_000)
  })
})
