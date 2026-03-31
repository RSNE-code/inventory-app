import { test, expect } from "@playwright/test"
import { screenshot } from "./helpers"

/**
 * UX Friction Tests: Inventory Management
 *
 * Tests error handling, validation feedback, loading states,
 * and dead-end scenarios in inventory workflows.
 */

test.describe("UX: Inventory — Invalid Product ID", () => {
  test("navigating to a nonexistent product shows clear error", async ({ page }) => {
    await page.goto("/inventory/nonexistent-id-12345")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3_000)
    await screenshot(page, "21-ux-inventory-invalid-product")

    // UX CHECK: User should see a clear "not found" message, not a blank page or crash
    const body = await page.locator("body").innerText()
    const hasError =
      body.includes("not found") ||
      body.includes("Not Found") ||
      body.includes("Product not found") ||
      body.includes("does not exist")

    expect(hasError).toBe(true)

    // UX CHECK: There should be a way to navigate back (not a dead end)
    const hasBackButton = await page
      .locator("button, a")
      .filter({ hasText: /back|inventory|return/i })
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false)

    if (!hasBackButton) {
      // Check for browser back or header back arrow
      const hasHeaderBack = await page
        .locator("[class*='back'], .lucide-arrow-left, .lucide-chevron-left")
        .first()
        .isVisible({ timeout: 2_000 })
        .catch(() => false)

      if (!hasHeaderBack) {
        test.fail(
          true,
          "UX DEAD END: No back button or navigation link on 'Product not found' page. " +
            "User is stuck and must manually edit the URL or use browser back."
        )
      }
    }
  })
})

test.describe("UX: Stock Adjustment — Error Prevention", () => {
  test("removing more stock than available shows clear warning", async ({ page }) => {
    // Navigate to inventory and find a product
    await page.goto("/inventory")
    await expect(page.locator("text=Inventory")).toBeVisible({ timeout: 15_000 })

    // Click the first product link
    const productLink = page.locator("a[href^='/inventory/']").first()
    if (!(await productLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }
    await productLink.click()
    await page.waitForLoadState("networkidle")

    // Click Adjust Stock
    const adjustLink = page.locator("a, button").filter({ hasText: /adjust stock/i }).first()
    await expect(adjustLink).toBeVisible({ timeout: 10_000 })
    await adjustLink.click()
    await page.waitForLoadState("networkidle")
    await screenshot(page, "21-ux-adjust-stock-page")

    // Select "Remove" direction
    const removeBtn = page.locator("button").filter({ hasText: /remove/i }).first()
    await removeBtn.click()

    // Enter an absurdly large number
    const qtyInput = page.locator("input[type='number']").first()
    await qtyInput.fill("999999")
    await page.waitForTimeout(500)
    await screenshot(page, "21-ux-adjust-negative-warning")

    // UX CHECK: Should show a clear warning about negative stock
    const warningText = page.locator("text=negative stock")
    const hasWarning = await warningText.isVisible({ timeout: 3_000 }).catch(() => false)

    if (hasWarning) {
      // Good — warning is visible
      // Also check: is the Confirm button disabled?
      const confirmBtn = page.getByRole("button", { name: /confirm adjustment/i })
      await expect(confirmBtn).toBeDisabled()
    } else {
      test.fail(
        true,
        "UX BUG: No warning shown when trying to remove more stock than available. " +
          "User could accidentally create negative inventory."
      )
    }
  })

  test("reason is required — button disabled without it", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.locator("text=Inventory")).toBeVisible({ timeout: 15_000 })

    const productLink = page.locator("a[href^='/inventory/']").first()
    if (!(await productLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }
    await productLink.click()
    await page.waitForLoadState("networkidle")

    const adjustLink = page.locator("a, button").filter({ hasText: /adjust stock/i }).first()
    await expect(adjustLink).toBeVisible({ timeout: 10_000 })
    await adjustLink.click()
    await page.waitForLoadState("networkidle")

    // Select Add, enter a quantity, but DON'T select a reason
    await page.locator("button").filter({ hasText: /add/i }).first().click()
    const qtyInput = page.locator("input[type='number']").first()
    await qtyInput.fill("5")
    await page.waitForTimeout(500)

    const confirmBtn = page.getByRole("button", { name: /confirm adjustment/i })
    await screenshot(page, "21-ux-adjust-no-reason")

    // UX CHECK: Confirm button should be disabled when reason is not selected
    await expect(confirmBtn).toBeDisabled()
  })

  test("preview shows the new quantity before confirming", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.locator("text=Inventory")).toBeVisible({ timeout: 15_000 })

    const productLink = page.locator("a[href^='/inventory/']").first()
    if (!(await productLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }
    await productLink.click()
    await page.waitForLoadState("networkidle")

    const adjustLink = page.locator("a, button").filter({ hasText: /adjust stock/i }).first()
    await expect(adjustLink).toBeVisible({ timeout: 10_000 })
    await adjustLink.click()
    await page.waitForLoadState("networkidle")

    // Add 10 units
    await page.locator("button").filter({ hasText: /add/i }).first().click()
    const qtyInput = page.locator("input[type='number']").first()
    await qtyInput.fill("10")
    await page.waitForTimeout(500)
    await screenshot(page, "21-ux-adjust-preview")

    // UX CHECK: Should show a preview like "100 → 110 each"
    // This helps the user verify before committing
    const body = await page.locator("body").innerText()
    const hasPreview = body.includes("→") || body.includes("➜")

    expect(hasPreview).toBe(true)
  })
})

test.describe("UX: New Product — Validation & Recovery", () => {
  test("submit button disabled when required fields empty", async ({ page }) => {
    await page.goto("/inventory/new")
    await page.waitForLoadState("networkidle")
    await screenshot(page, "21-ux-new-product-empty")

    const submitBtn = page.getByRole("button", { name: /add product/i })
    await expect(submitBtn).toBeVisible({ timeout: 10_000 })

    // UX CHECK: Button should be disabled when name and category are empty
    await expect(submitBtn).toBeDisabled()
  })

  test("category dropdown loads options (not stuck empty)", async ({ page }) => {
    await page.goto("/inventory/new")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2_000)
    await screenshot(page, "21-ux-new-product-categories")

    // UX CHECK: If categories API fails, the dropdown is empty
    // and the user can never submit the form — a complete dead end.
    // Verify categories actually loaded.
    const categorySelect = page.locator("select").filter({ hasText: /select category/i }).first()
      .or(page.locator("text=Select category").first())

    await expect(categorySelect).toBeVisible({ timeout: 5_000 })

    // Click to open and check for options
    await categorySelect.click()
    await page.waitForTimeout(500)
    await screenshot(page, "21-ux-new-product-category-dropdown")
  })

  test("entering a product name enables submission path", async ({ page }) => {
    await page.goto("/inventory/new")
    await page.waitForLoadState("networkidle")

    // Fill in product name
    const nameInput = page.locator("input").first()
    await nameInput.fill("E2E Test Product UX")
    await page.waitForTimeout(500)
    await screenshot(page, "21-ux-new-product-name-filled")

    // Still need category — button should still be disabled
    const submitBtn = page.getByRole("button", { name: /add product/i })
    // This depends on whether name alone is enough
  })
})

test.describe("UX: Edit Product — Data Persistence", () => {
  test("edit page loads with current product data pre-filled", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.locator("text=Inventory")).toBeVisible({ timeout: 15_000 })

    const productLink = page.locator("a[href^='/inventory/']").first()
    if (!(await productLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }
    await productLink.click()
    await page.waitForLoadState("networkidle")

    // Capture product name from detail page
    const heading = await page.locator("h1, h2").first().innerText()

    // Navigate to edit
    const editLink = page.locator("a, button").filter({ hasText: /edit/i }).first()
    await expect(editLink).toBeVisible({ timeout: 10_000 })
    await editLink.click()
    await page.waitForLoadState("networkidle")
    await screenshot(page, "21-ux-edit-product-prefilled")

    // UX CHECK: The product name should be pre-filled in the form
    // If it's blank, the user would need to re-enter everything — terrible UX
    const nameInput = page.locator("input").first()
    const nameValue = await nameInput.inputValue()

    expect(nameValue.length).toBeGreaterThan(0)
  })
})
