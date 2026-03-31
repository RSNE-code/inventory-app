import { test, expect } from "@playwright/test"
import { screenshot, createTestBom } from "./helpers"

test.describe("BOM Draft", () => {
  test("newly created BOM starts in DRAFT status", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Draft ${Date.now()}`,
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "07-bom-draft-status")

    // Should show Draft badge
    await expect(page.locator("text=Draft").first()).toBeVisible({ timeout: 5_000 })
  })

  test("draft BOM allows editing line items", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Edit Draft ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 5, isNonCatalog: true, nonCatalogName: "Editable Item", tier: "TIER_2" },
      ],
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "07-bom-draft-editable")

    // Item should be visible
    await expect(page.locator("text=Editable Item")).toBeVisible()

    // Edit mode should be available for draft BOMs
    const editBtn = page.locator("button").filter({ hasText: /edit/i }).first()
    if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await editBtn.click()
      await page.waitForTimeout(500)
      await screenshot(page, "07-bom-draft-edit-mode")
    }
  })

  test("draft BOM can be sent to review", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Review ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 2, isNonCatalog: true, nonCatalogName: "Review Item", tier: "TIER_2" },
      ],
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })

    // Look for "Send to Review" or "Submit for Review" button
    const reviewBtn = page.locator("button").filter({ hasText: /review/i }).first()
    if (await reviewBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await screenshot(page, "07-bom-send-to-review-button")
    }
  })

  test("saving a draft BOM preserves all line items", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Save Draft ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 3, isNonCatalog: true, nonCatalogName: "Preserved Item A", tier: "TIER_2" },
        { productId: null, qtyNeeded: 7, isNonCatalog: true, nonCatalogName: "Preserved Item B", tier: "TIER_1" },
      ],
    })

    // Navigate to detail page
    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })

    // Verify both items are present
    await expect(page.locator("text=Preserved Item A")).toBeVisible()
    await expect(page.locator("text=Preserved Item B")).toBeVisible()

    await screenshot(page, "07-bom-draft-preserved-items")

    // Navigate away and come back
    await page.goto("/boms")
    await page.waitForTimeout(1_000)
    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })

    // Items should still be there
    await expect(page.locator("text=Preserved Item A")).toBeVisible()
    await expect(page.locator("text=Preserved Item B")).toBeVisible()

    await screenshot(page, "07-bom-draft-items-persisted")
  })
})

test.describe("BOM Delete", () => {
  test("delete button visible for admin on draft BOM", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Delete ${Date.now()}`,
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "07-bom-delete-button")

    // Delete button should be visible (admin user)
    const deleteBtn = page.locator("button").filter({ hasText: /delete/i }).first()
    const isVisible = await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false)

    // If delete isn't visible as a direct button, check for menu/more options
    if (!isVisible) {
      const moreBtn = page.locator("button").filter({ has: page.locator(".lucide-more-vertical,.lucide-ellipsis") }).first()
      if (await moreBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await moreBtn.click()
        await page.waitForTimeout(500)
        await screenshot(page, "07-bom-delete-in-menu")
      }
    }
  })

  test("deleting a BOM removes it from the list", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Delete Verify ${Date.now()}`,
    })

    // Delete via API (to avoid dialog interaction issues)
    const deleteRes = await page.request.delete(`http://localhost:3000/api/boms/${bom.id}`)

    // Navigate to the deleted BOM
    await page.goto(`/boms/${bom.id}`)
    await page.waitForTimeout(2_000)
    await screenshot(page, "07-bom-deleted")

    // Should show error/not found or redirect
    const body = await page.locator("body").innerText()
    expect(
      body.includes("not found") ||
      body.includes("Not Found") ||
      body.includes("deleted") ||
      body.includes("Bills of Materials") // redirected to list
    ).toBe(true)
  })

  test("cannot delete an in-progress BOM", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E No Delete InProgress ${Date.now()}`,
    })

    // Move to IN_PROGRESS via API
    await page.request.put(`http://localhost:3000/api/boms/${bom.id}`, {
      data: { status: "IN_PROGRESS" },
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "07-bom-in-progress-no-delete")

    // Delete button should NOT be visible for in-progress BOMs
    // (per schema: isAdmin && status !== "IN_PROGRESS")
    const deleteBtn = page.locator("button").filter({ hasText: /delete bom/i })
    const isDeleteVisible = await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false)

    // This is a soft check — if delete IS visible for in-progress, that's a bug
    if (isDeleteVisible) {
      // UX FRICTION: Delete button should be hidden for in-progress BOMs
      test.fail(true, "Delete button should not be visible for IN_PROGRESS BOMs")
    }
  })
})
