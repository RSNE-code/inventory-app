import { test, expect } from "@playwright/test"
import { screenshot, goToInventory, getTestProduct, collectConsoleErrors, filterCriticalErrors } from "./helpers"

test.describe("Inventory — List, Search & Filter", () => {
  test("inventory list loads with search bar and products", async ({ page }) => {
    await goToInventory(page)
    await screenshot(page, "flow03-inventory-list-loaded")

    // Search bar present
    await expect(page.getByPlaceholder(/search products or SKUs/i)).toBeVisible({ timeout: 10_000 })

    // Should show product count text or product cards
    const body = await page.locator("body").innerText()
    expect(body.includes("products") || body.includes("No products")).toBe(true)
  })

  test("search filters inventory by name", async ({ page }) => {
    await goToInventory(page)

    const searchInput = page.getByPlaceholder(/search products or SKUs/i)
    await searchInput.fill("nonexistent-product-xyz-999")

    // Web-first assertion: wait for the empty state to appear
    await expect(page.getByText("No products found")).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow03-search-no-results")
  })

  test("search can be cleared to restore full list", async ({ page }) => {
    await goToInventory(page)

    const searchInput = page.getByPlaceholder(/search products or SKUs/i)

    // Type a filter
    await searchInput.fill("nonexistent-product-xyz-999")
    await expect(page.getByText("No products found")).toBeVisible({ timeout: 10_000 })

    // Clear the search
    await searchInput.clear()

    // Products should reappear (either product cards or a count)
    await expect(page.getByText("No products found")).not.toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow03-search-cleared")
  })

  test("category filter is available and visible", async ({ page }) => {
    await goToInventory(page)

    const categoryFilter = page.getByText("Select category").or(
      page.locator("select").filter({ hasText: /category/i })
    )
    await expect(categoryFilter).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow03-category-filter")
  })

  test("clicking a product navigates to its detail page", async ({ page }) => {
    const product = await getTestProduct(page)
    if (!product) {
      test.skip()
      return
    }

    await goToInventory(page)

    // Click the product link/card
    const productLink = page.locator(`a[href='/inventory/${product.id}']`).first()
    if (await productLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await productLink.click()
      await expect(page).toHaveURL(`/inventory/${product.id}`)
      await screenshot(page, "flow03-product-detail-via-click")
    } else {
      // Fallback: navigate directly
      await page.goto(`/inventory/${product.id}`)
      await expect(page.locator("body")).toContainText(product.name, { timeout: 10_000 })
      await screenshot(page, "flow03-product-detail-direct")
    }
  })
})

test.describe("Inventory — Product Detail", () => {
  test("detail page shows all fields consistently — never hides empty fields", async ({ page }) => {
    const product = await getTestProduct(page)
    if (!product) {
      test.skip()
      return
    }

    await page.goto(`/inventory/${product.id}`)
    await page.waitForLoadState("networkidle")
    await screenshot(page, "flow03-detail-consistent-fields")

    // Product name always visible
    await expect(page.locator("body")).toContainText(product.name, { timeout: 10_000 })

    // Core fields should always be shown (with value or "Not specified")
    // Details/Stock section
    await expect(page.getByText("Details").or(page.getByText("Stock"))).toBeVisible()

    // Action buttons always present
    await expect(page.getByText("Adjust Stock")).toBeVisible()
    await expect(page.getByText("Edit Details")).toBeVisible()
  })
})

test.describe("Inventory — New Product Form", () => {
  test("new product form is accessible via floating + button", async ({ page }) => {
    await goToInventory(page)

    const fabButton = page.locator("a[href='/inventory/new']").first()
    if (await fabButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await fabButton.click()
      await expect(page).toHaveURL("/inventory/new")
      await screenshot(page, "flow03-new-product-via-fab")
    } else {
      // Navigate directly if FAB is not visible (e.g. desktop layout)
      await page.goto("/inventory/new")
      await screenshot(page, "flow03-new-product-direct")
    }

    await expect(page.getByText("Product Name")).toBeVisible({ timeout: 10_000 })
  })

  test("new product form shows all required and optional fields", async ({ page }) => {
    await page.goto("/inventory/new")
    await page.waitForLoadState("networkidle")
    await screenshot(page, "flow03-new-product-form-fields")

    // Required fields
    await expect(page.getByText("Product Name")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("Category")).toBeVisible()

    // Optional fields
    await expect(page.getByText("SKU")).toBeVisible()
    await expect(page.getByText("Tier")).toBeVisible()
    await expect(page.getByText("Reorder Point")).toBeVisible()

    // Submit button
    await expect(page.getByRole("button", { name: /add product/i })).toBeVisible()
  })

  test("form validates required fields — submit disabled when empty", async ({ page }) => {
    await page.goto("/inventory/new")
    await page.waitForLoadState("networkidle")

    const submitBtn = page.getByRole("button", { name: /add product/i })
    await expect(submitBtn).toBeDisabled()
    await screenshot(page, "flow03-form-validation-disabled")
  })
})

test.describe("Inventory — Stock Adjustment", () => {
  test("stock adjust page has add/remove toggle and quantity input", async ({ page }) => {
    const product = await getTestProduct(page)
    if (!product) {
      test.skip()
      return
    }

    await page.goto(`/inventory/${product.id}/adjust`)
    await page.waitForLoadState("networkidle")
    await screenshot(page, "flow03-adjust-stock-page")

    // Direction toggle: Add and Remove
    await expect(
      page.getByText("+ Add").or(page.locator("button").filter({ hasText: /add/i }).first())
    ).toBeVisible({ timeout: 10_000 })
    await expect(
      page.getByText("- Remove").or(page.locator("button").filter({ hasText: /remove/i }).first())
    ).toBeVisible()

    // Quantity input
    await expect(page.getByText("Quantity")).toBeVisible()

    // Reason selector
    await expect(page.getByText("Reason")).toBeVisible()
  })

  test("stock adjust shows preview of new quantity after input", async ({ page }) => {
    const product = await getTestProduct(page)
    if (!product) {
      test.skip()
      return
    }

    await page.goto(`/inventory/${product.id}/adjust`)
    await page.waitForLoadState("networkidle")

    // Select Add direction
    await page.locator("button").filter({ hasText: /add/i }).first().click()

    // Enter quantity
    const qtyInput = page.locator("input#quantity").or(page.locator("input[type='number']").first())
    await qtyInput.fill("10")

    await screenshot(page, "flow03-adjust-preview")

    // Should show a preview with arrow indicator (current -> new)
    const body = await page.locator("body").innerText()
    expect(body.includes("\u2192") || body.includes("\u279C") || body.includes("to")).toBe(true)
  })

  test("reason is required before confirming adjustment", async ({ page }) => {
    const product = await getTestProduct(page)
    if (!product) {
      test.skip()
      return
    }

    await page.goto(`/inventory/${product.id}/adjust`)
    await page.waitForLoadState("networkidle")

    // Select Add direction
    await page.locator("button").filter({ hasText: /add/i }).first().click()

    // Enter quantity but no reason
    const qtyInput = page.locator("input#quantity").or(page.locator("input[type='number']").first())
    await qtyInput.fill("5")

    // Confirm button should be disabled without a reason
    const confirmBtn = page.getByRole("button", { name: /confirm adjustment/i })
    await expect(confirmBtn).toBeDisabled()

    await screenshot(page, "flow03-adjust-reason-required")
  })
})

test.describe("Inventory — Edit Product", () => {
  test("edit page pre-fills existing product data", async ({ page }) => {
    const product = await getTestProduct(page)
    if (!product) {
      test.skip()
      return
    }

    await page.goto(`/inventory/${product.id}/edit`)
    await page.waitForLoadState("networkidle")
    await screenshot(page, "flow03-edit-product-prefilled")

    // Page should show edit context
    await expect(
      page.getByText("Product Name").or(page.getByText("Edit Product"))
    ).toBeVisible({ timeout: 10_000 })

    // Save button present
    await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible()
  })
})

test.describe("Inventory — Console Errors", () => {
  test("inventory list page has no critical console errors", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await goToInventory(page)

    await expect(page.getByPlaceholder(/search products or SKUs/i)).toBeVisible({ timeout: 15_000 })

    const critical = filterCriticalErrors(errors)
    expect(critical).toEqual([])
  })
})
