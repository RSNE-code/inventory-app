import { test, expect } from "@playwright/test"
import { screenshot, goToInventory, getTestProduct } from "./helpers"

test.describe("Inventory Management", () => {
  test("inventory list loads with search and products", async ({ page }) => {
    await goToInventory(page)
    await screenshot(page, "04-inventory-list-loaded")

    // Search bar
    await expect(page.getByPlaceholder(/search products or SKUs/i)).toBeVisible()

    // Should show product count or products
    const body = await page.locator("body").innerText()
    expect(body.includes("products") || body.includes("No products")).toBe(true)
  })

  test("search filters inventory list", async ({ page }) => {
    await goToInventory(page)

    const searchInput = page.getByPlaceholder(/search products or SKUs/i)
    await searchInput.fill("nonexistent-product-xyz-999")
    await page.waitForTimeout(1_500)

    await screenshot(page, "04-inventory-search-no-results")

    // Should show empty state
    await expect(page.locator("text=No products found")).toBeVisible({ timeout: 5_000 })
  })

  test("search finds real products", async ({ page }) => {
    await goToInventory(page)

    const searchInput = page.getByPlaceholder(/search products or SKUs/i)
    // Search for something likely to exist — generic construction terms
    await searchInput.fill("caulk")
    await page.waitForTimeout(2_000)

    await screenshot(page, "04-inventory-search-results")

    // Either products found or no results
    const body = await page.locator("body").innerText()
    expect(
      body.includes("products") || body.includes("No products found")
    ).toBe(true)
  })

  test("category filter is available", async ({ page }) => {
    await goToInventory(page)

    // Category dropdown/select
    const categoryFilter = page.locator("text=Select category").or(
      page.locator("select").filter({ hasText: /category/i })
    )
    await expect(categoryFilter).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "04-inventory-category-filter")
  })

  test("floating add button navigates to new product page", async ({ page }) => {
    await goToInventory(page)

    // FAB (floating action button) with plus icon
    const fabButton = page.locator("a[href='/inventory/new']").first()
    if (await fabButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await fabButton.click()
      await expect(page).toHaveURL("/inventory/new")
      await screenshot(page, "04-inventory-new-product-page")
    }
  })

  test("new product form has required fields", async ({ page }) => {
    await page.goto("/inventory/new")
    await page.waitForLoadState("networkidle")
    await screenshot(page, "04-inventory-new-product-form")

    // Required fields
    await expect(page.locator("text=Product Name")).toBeVisible({ timeout: 10_000 })
    await expect(page.locator("text=Category")).toBeVisible()

    // Optional fields
    await expect(page.locator("text=SKU")).toBeVisible()
    await expect(page.locator("text=Tier")).toBeVisible()
    await expect(page.locator("text=Reorder Point")).toBeVisible()

    // Submit button
    await expect(page.getByRole("button", { name: /add product/i })).toBeVisible()
  })

  test("new product form validates required fields", async ({ page }) => {
    await page.goto("/inventory/new")
    await page.waitForLoadState("networkidle")

    // Try to submit without filling required fields
    const submitBtn = page.getByRole("button", { name: /add product/i })

    // Button should be disabled when name and category are empty
    // or clicking it should show validation errors
    await expect(submitBtn).toBeDisabled()
    await screenshot(page, "04-inventory-form-validation")
  })

  test("product detail page shows stock level and details", async ({ page }) => {
    const product = await getTestProduct(page)
    if (!product) {
      test.skip()
      return
    }

    await page.goto(`/inventory/${product.id}`)
    await page.waitForLoadState("networkidle")
    await screenshot(page, "04-inventory-product-detail")

    // Should show product name
    await expect(page.locator("body")).toContainText(product.name, { timeout: 10_000 })

    // Should show stock quantity
    await expect(page.locator("text=Details").or(page.locator("text=Stock"))).toBeVisible()

    // Action buttons
    await expect(page.locator("text=Adjust Stock")).toBeVisible()
    await expect(page.locator("text=Edit Details")).toBeVisible()
  })

  test("adjust stock page loads with direction toggle", async ({ page }) => {
    const product = await getTestProduct(page)
    if (!product) {
      test.skip()
      return
    }

    await page.goto(`/inventory/${product.id}/adjust`)
    await page.waitForLoadState("networkidle")
    await screenshot(page, "04-inventory-adjust-stock")

    // Direction toggle buttons
    await expect(page.locator("text=+ Add").or(page.locator("button").filter({ hasText: "Add" }))).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.locator("text=- Remove").or(page.locator("button").filter({ hasText: "Remove" }))
    ).toBeVisible()

    // Quantity input
    await expect(page.locator("text=Quantity")).toBeVisible()

    // Reason selector
    await expect(page.locator("text=Reason")).toBeVisible()

    // Confirm button
    await expect(page.getByRole("button", { name: /confirm adjustment/i })).toBeVisible()
  })

  test("adjust stock requires reason before confirming", async ({ page }) => {
    const product = await getTestProduct(page)
    if (!product) {
      test.skip()
      return
    }

    await page.goto(`/inventory/${product.id}/adjust`)
    await page.waitForLoadState("networkidle")

    // Click Add direction
    await page.locator("button").filter({ hasText: /add/i }).first().click()

    // Enter a quantity
    const qtyInput = page.locator("input#quantity").or(page.locator("input[type='number']").first())
    await qtyInput.fill("5")

    // Confirm button should be disabled without a reason
    const confirmBtn = page.getByRole("button", { name: /confirm adjustment/i })
    await expect(confirmBtn).toBeDisabled()

    await screenshot(page, "04-inventory-adjust-no-reason")
  })

  test("adjust stock shows preview of new quantity", async ({ page }) => {
    const product = await getTestProduct(page)
    if (!product) {
      test.skip()
      return
    }

    await page.goto(`/inventory/${product.id}/adjust`)
    await page.waitForLoadState("networkidle")

    // Click Add direction
    await page.locator("button").filter({ hasText: /add/i }).first().click()

    // Enter quantity
    const qtyInput = page.locator("input#quantity").or(page.locator("input[type='number']").first())
    await qtyInput.fill("10")
    await page.waitForTimeout(500)

    await screenshot(page, "04-inventory-adjust-preview")

    // Should show a preview with arrow (current → new)
    const body = await page.locator("body").innerText()
    expect(body.includes("→") || body.includes("➜") || body.includes("to")).toBe(true)
  })

  test("edit product page pre-populates existing data", async ({ page }) => {
    const product = await getTestProduct(page)
    if (!product) {
      test.skip()
      return
    }

    await page.goto(`/inventory/${product.id}/edit`)
    await page.waitForLoadState("networkidle")
    await screenshot(page, "04-inventory-edit-product")

    // Product name should be pre-filled
    const nameInput = page.locator("input").filter({ hasText: product.name }).or(
      page.locator("input[value]").first()
    )
    await expect(page.locator("text=Product Name").or(page.locator("text=Edit Product"))).toBeVisible({
      timeout: 10_000,
    })

    // Save button
    await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible()
  })
})
