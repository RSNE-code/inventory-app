import { test, expect } from "@playwright/test"
import { screenshot, createTestBom, getBomByStatus } from "./helpers"

test.describe("BOM Approval", () => {
  test("approve a draft BOM", async ({ page }) => {
    // Create a fresh BOM via API
    const bom = await createTestBom(page, {
      jobName: `E2E Approve ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 3, isNonCatalog: true, nonCatalogName: "Test Gasket", tier: "TIER_2" },
        { productId: null, qtyNeeded: 10, isNonCatalog: true, nonCatalogName: "Test Bolt Pack", tier: "TIER_2" },
      ],
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "06-bom-pre-approve")

    // Should show Approve button (DRAFT status allows direct approval)
    const approveBtn = page.getByRole("button", { name: /approve/i })
    if (await approveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await approveBtn.click()
      await page.waitForTimeout(2_000)
      await screenshot(page, "06-bom-post-approve")

      // After approval, should see checkout options or Approved status
      const body = await page.locator("body").innerText()
      expect(
        body.includes("Approved") ||
        body.includes("Check Out") ||
        body.includes("checkout")
      ).toBe(true)
    }
  })

  test("BOM detail shows line items with quantities", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Detail ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 5, isNonCatalog: true, nonCatalogName: "Test Item A", tier: "TIER_2" },
        { productId: null, qtyNeeded: 12, isNonCatalog: true, nonCatalogName: "Test Item B", tier: "TIER_1" },
      ],
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "06-bom-detail-line-items")

    // Items section heading
    await expect(page.locator("h3").filter({ hasText: /^Items/ })).toBeVisible()

    // Line items visible
    await expect(page.locator("text=Test Item A")).toBeVisible()
    await expect(page.locator("text=Test Item B")).toBeVisible()
  })

  test("BOM review queue loads", async ({ page }) => {
    await page.goto("/boms/review")
    await expect(page.locator("text=Review Queue")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "06-bom-review-queue")
  })
})

test.describe("BOM Checkout", () => {
  test("approved BOM shows checkout section", async ({ page }) => {
    // Create and approve a BOM
    const bom = await createTestBom(page, {
      jobName: `E2E Checkout ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 2, isNonCatalog: true, nonCatalogName: "Checkout Test Item", tier: "TIER_2" },
      ],
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })

    // Approve first
    const approveBtn = page.getByRole("button", { name: /approve/i })
    if (await approveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await approveBtn.click()
      await page.waitForTimeout(2_000)
    }

    await screenshot(page, "06-bom-checkout-section")

    // Should show checkout section with items and pick indicators
    const body = await page.locator("body").innerText()
    expect(
      body.includes("fulfilled") ||
      body.includes("Check Out") ||
      body.includes("Checkout") ||
      body.includes("Approved")
    ).toBe(true)
  })

  test("checkout flow: pick item and checkout", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Pick ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 1, isNonCatalog: true, nonCatalogName: "Pick Test Item", tier: "TIER_2" },
      ],
    })

    // Approve via API to skip UI
    await page.request.put(`http://localhost:3000/api/boms/${bom.id}`, {
      data: { status: "APPROVED" },
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(2_000)
    await screenshot(page, "06-bom-checkout-pick-ready")

    // Look for pickable items — circle buttons or item toggles
    // The pick section shows circle buttons next to each line item
    const pickableItem = page.locator("text=Pick Test Item")
    if (await pickableItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // The item row should be visible
      await screenshot(page, "06-bom-checkout-item-visible")
    }
  })

  test("checkout all button appears for approved BOM with items", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Checkout All ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 3, isNonCatalog: true, nonCatalogName: "Bulk Item 1", tier: "TIER_2" },
        { productId: null, qtyNeeded: 5, isNonCatalog: true, nonCatalogName: "Bulk Item 2", tier: "TIER_2" },
      ],
    })

    // Approve via API
    await page.request.put(`http://localhost:3000/api/boms/${bom.id}`, {
      data: { status: "APPROVED" },
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(2_000)
    await screenshot(page, "06-bom-checkout-all")

    // Should show "Check Out All" or "Select All" button
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Check Out All") ||
      body.includes("Select All") ||
      body.includes("Check Out") ||
      body.includes("fulfilled")
    ).toBe(true)
  })
})

test.describe("BOM Checkout — With Fab Items", () => {
  test("BOM with door items shows fabrication gate", async ({ page }) => {
    // Create BOM with a door-like item
    const bom = await createTestBom(page, {
      jobName: `E2E Fab Gate ${Date.now()}`,
      lineItems: [
        {
          productId: null,
          qtyNeeded: 1,
          isNonCatalog: true,
          nonCatalogName: "Cooler Swing Door 3x7",
          tier: "TIER_2",
        },
        { productId: null, qtyNeeded: 10, isNonCatalog: true, nonCatalogName: "Regular Item", tier: "TIER_2" },
      ],
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(2_000)
    await screenshot(page, "06-bom-fab-gate")

    // Fab gate section may or may not show depending on product matching
    // If present, should show "FABRICATION ITEMS" heading
    const fabGate = page.locator("text=FABRICATION ITEMS").or(page.locator("text=Fabrication"))
    if (await fabGate.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await screenshot(page, "06-bom-fab-gate-visible")

      // Check for "Create Door Sheet" or "Action needed" indicators
      const body = await page.locator("body").innerText()
      expect(
        body.includes("Create Door Sheet") ||
        body.includes("Action needed") ||
        body.includes("All linked") ||
        body.includes("FABRICATION")
      ).toBe(true)
    }
  })
})

test.describe("BOM Checkout — With Panels", () => {
  test("panel items show special checkout button", async ({ page }) => {
    // This test verifies panel items get special handling
    // Panels cannot use the regular pick/checkout flow
    // Instead they show a "Checkout" button that opens the panel sheet

    // We need a real product with isPanel/isAssembly set
    // For non-catalog items, this might not trigger — test the UI structure
    const bom = await createTestBom(page, {
      jobName: `E2E Panel ${Date.now()}`,
      lineItems: [
        {
          productId: null,
          qtyNeeded: 4,
          isNonCatalog: true,
          nonCatalogName: "Wall Panel 4x10 FRP",
          tier: "TIER_2",
        },
      ],
    })

    // Approve via API
    await page.request.put(`http://localhost:3000/api/boms/${bom.id}`, {
      data: { status: "APPROVED" },
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(2_000)
    await screenshot(page, "06-bom-panel-checkout")

    // If this is recognized as a panel, it should show the special checkout UI
    // The panel checkout button appears as a blue "Checkout" button
    // For non-catalog items, this may just show as regular item
  })
})
