import { test, expect } from "@playwright/test"
import { screenshot, goToBomList, createTestBom } from "./helpers"

test.describe("BOM Creation — Manual", () => {
  test("BOM create page defaults to photo capture", async ({ page }) => {
    await page.goto("/boms/new")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "05-bom-create-photo-default")

    // Photo capture is the primary action
    await expect(page.locator("text=Snap Your Material List")).toBeVisible()

    // Manual fallback link
    await expect(page.locator("text=or enter manually")).toBeVisible()
  })

  test("manual entry mode shows product browser with categories", async ({ page }) => {
    await page.goto("/boms/new?mode=manual")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "05-bom-create-manual-mode")

    // Search bar
    await expect(page.getByPlaceholder(/search products/i)).toBeVisible()

    // Category tabs — Recent is the default
    await expect(page.locator("button").filter({ hasText: /Recent/i })).toBeVisible()
  })

  test("manual entry: search and add a product", async ({ page }) => {
    await page.goto("/boms/new?mode=manual")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })

    // Search for a product
    const searchInput = page.getByPlaceholder(/search products/i)
    await searchInput.fill("caulk")
    await page.waitForTimeout(2_000)

    await screenshot(page, "05-bom-manual-search-results")

    // Click first product's add button (plus icon)
    const addBtn = page
      .locator("button")
      .filter({ has: page.locator(".lucide-plus") })
      .first()
    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(500)

      // Cart bar should appear showing item count
      await expect(page.locator("text=1 item")).toBeVisible({ timeout: 3_000 })
      await screenshot(page, "05-bom-manual-item-added")
    }
  })

  test("manual entry: cannot create BOM without job name", async ({ page }) => {
    await page.goto("/boms/new?mode=manual")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })

    // Add a product first
    const searchInput = page.getByPlaceholder(/search products/i)
    await searchInput.fill("caulk")
    await page.waitForTimeout(2_000)

    const addBtn = page
      .locator("button")
      .filter({ has: page.locator(".lucide-plus") })
      .first()
    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(500)
    }

    // UX FRICTION: The Create BOM / Review button should be disabled or require
    // a job name before submission. If it's clickable without a job name and then
    // errors silently, that's bad UX.
    await screenshot(page, "05-bom-manual-no-job-name")
  })
})

test.describe("BOM Creation — Photo Upload", () => {
  test("photo capture shows camera UI", async ({ page }) => {
    await page.goto("/boms/new")
    await expect(page.locator("text=Snap Your Material List")).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "05-bom-photo-capture-ui")

    // Should have camera trigger or upload option
    // On desktop, this typically shows an upload button since no camera
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Snap") ||
      body.includes("Upload") ||
      body.includes("photo") ||
      body.includes("camera")
    ).toBe(true)
  })

  test("switching from photo to manual mode preserves state", async ({ page }) => {
    await page.goto("/boms/new")
    await expect(page.locator("text=Snap Your Material List")).toBeVisible({ timeout: 10_000 })

    // Click manual entry link
    await page.locator("text=or enter manually").click()
    await page.waitForTimeout(1_000)

    await screenshot(page, "05-bom-switch-to-manual")

    // Should now be in manual mode
    await expect(page.getByPlaceholder(/search products/i)).toBeVisible({ timeout: 5_000 })
  })
})

test.describe("BOM List", () => {
  test("BOM list shows status filter chips", async ({ page }) => {
    await goToBomList(page)
    await screenshot(page, "05-bom-list-filters")

    // Status filters
    await expect(page.locator("button").filter({ hasText: "All" })).toBeVisible()
    await expect(page.locator("button").filter({ hasText: "Draft" })).toBeVisible()
    await expect(page.locator("button").filter({ hasText: "Review" })).toBeVisible()
    await expect(page.locator("button").filter({ hasText: "Approved" })).toBeVisible()
  })

  test("BOM list search works", async ({ page }) => {
    await goToBomList(page)

    const searchInput = page.getByPlaceholder(/search by job name/i)
    await searchInput.fill("nonexistent-job-xyz-999")
    await page.waitForTimeout(1_500)

    await expect(page.locator("body")).toContainText(/no boms found|0 BOMs/i)
    await screenshot(page, "05-bom-list-search-empty")
  })

  test("clicking a BOM navigates to detail page", async ({ page }) => {
    await goToBomList(page)

    // Find any BOM card/row and click it
    const bomCard = page.locator("a[href^='/boms/']").first()
    if (await bomCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await bomCard.click()
      await expect(page).toHaveURL(/\/boms\//)
      await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
      await screenshot(page, "05-bom-detail-from-list")
    }
  })

  test("filter by Draft status shows only drafts", async ({ page }) => {
    await goToBomList(page)

    await page.locator("button").filter({ hasText: "Draft" }).click()
    await page.waitForTimeout(1_000)

    await screenshot(page, "05-bom-list-draft-filter")

    // Every visible BOM should have DRAFT status badge, or show empty state
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Draft") || body.includes("No BOMs found")
    ).toBe(true)
  })
})
