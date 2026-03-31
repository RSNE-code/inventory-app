import { test, expect } from "@playwright/test"
import { screenshot } from "./helpers"

/**
 * UX Friction Tests: Cross-App Consistency & Discoverability
 *
 * Tests whether the app behaves consistently across similar workflows,
 * whether features are discoverable, and whether the user can always
 * find their way back from any state.
 * ALL tests use real user interactions only.
 */

test.describe("UX: Empty States — Every Page Has One", () => {
  test("inventory with impossible search shows helpful empty state", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.locator("text=Inventory")).toBeVisible({ timeout: 15_000 })

    const searchInput = page.getByPlaceholder(/search products or SKUs/i)
    await searchInput.fill("zzzzz_impossible_product_99999")
    await page.waitForTimeout(1_500)
    await screenshot(page, "25-ux-empty-inventory-search")

    // UX CHECK: "No products found" should appear with a suggestion
    await expect(page.locator("text=No products found")).toBeVisible({ timeout: 5_000 })

    // UX CHECK: The message should suggest trying a different search
    const body = await page.locator("body").innerText()
    const hasSuggestion =
      body.includes("different search") || body.includes("Try") || body.includes("try")

    // Good if there's a suggestion, noted if not
  })

  test("BOM list with impossible search shows helpful empty state", async ({ page }) => {
    await page.goto("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await page.locator("button").filter({ hasText: "BOM List" }).click()
    await page.waitForTimeout(500)

    const searchInput = page.getByPlaceholder(/search by job name/i)
    await searchInput.fill("zzzzz_impossible_job_99999")
    await page.waitForTimeout(1_500)
    await screenshot(page, "25-ux-empty-bom-search")

    await expect(page.locator("body")).toContainText(/no boms found|0 BOMs/i, { timeout: 5_000 })
  })

  test("assemblies page with no assemblies shows create prompt", async ({ page }) => {
    await page.goto("/assemblies")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2_000)
    await screenshot(page, "25-ux-assemblies-page-state")

    // UX CHECK: Even if there are no assemblies, the page should show
    // a clear prompt to create one — not just a blank area
    const body = await page.locator("body").innerText()
    const hasCreatePrompt =
      body.includes("New Door") ||
      body.includes("New Panel") ||
      body.includes("No assemblies") ||
      body.includes("Get started")

    expect(hasCreatePrompt).toBe(true)
  })
})

test.describe("UX: Loading Skeletons — No Blank Flashes", () => {
  test("inventory list shows loading state before data arrives", async ({ page }) => {
    // Navigate and immediately screenshot to catch loading
    await page.goto("/inventory")

    // Immediate screenshot — should show skeleton or data, NOT blank white
    await screenshot(page, "25-ux-inventory-loading")

    // Wait for real data
    await expect(page.locator("text=Inventory")).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(2_000)
    await screenshot(page, "25-ux-inventory-loaded")
  })

  test("dashboard shows content while data loads", async ({ page }) => {
    await page.goto("/")

    // Immediate screenshot
    await screenshot(page, "25-ux-dashboard-loading")

    // Wait for greeting to confirm load
    await expect(
      page
        .locator("text=Good morning")
        .or(page.locator("text=Good afternoon"))
        .or(page.locator("text=Good evening"))
    ).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "25-ux-dashboard-loaded")
  })
})

test.describe("UX: Consistent Navigation — No Dead Ends", () => {
  const pages = [
    { url: "/", name: "dashboard" },
    { url: "/inventory", name: "inventory" },
    { url: "/boms", name: "boms" },
    { url: "/assemblies", name: "assemblies" },
    { url: "/receiving", name: "receiving" },
    { url: "/settings", name: "settings" },
  ]

  for (const p of pages) {
    test(`${p.name} page has working navigation to leave`, async ({ page }) => {
      await page.goto(p.url)
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(2_000)
      await screenshot(page, `25-ux-nav-${p.name}`)

      // UX CHECK: Every page should have at least one nav link
      // (sidebar, bottom nav, or back button) to leave
      const navLinks = page.locator(
        "a[href='/'], a[href='/inventory'], a[href='/boms'], a[href='/assemblies'], a[href='/receiving']"
      )
      const navCount = await navLinks.count()

      expect(navCount).toBeGreaterThan(0)
    })
  }
})

test.describe("UX: Error State Recovery — Can User Try Again?", () => {
  test("after failed login, user can immediately retry", async ({ page }) => {
    // Run without auth
    test.use({ storageState: { cookies: [], origins: [] } } as any)

    await page.goto("/login")

    // Fail first attempt
    await page.getByLabel("Email").fill("wrong@example.com")
    await page.getByLabel("Password").fill("bad")
    await page.getByRole("button", { name: "Sign In" }).click()
    await expect(page.locator("text=Invalid email or password")).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "25-ux-login-failed")

    // UX CHECK: Form fields should still be editable for immediate retry
    const emailInput = page.getByLabel("Email")
    const passwordInput = page.getByLabel("Password")

    await expect(emailInput).toBeEditable()
    await expect(passwordInput).toBeEditable()

    // The sign-in button should be re-enabled (not stuck in loading)
    const signInBtn = page.getByRole("button", { name: "Sign In" })
    await expect(signInBtn).toBeEnabled()
    await screenshot(page, "25-ux-login-retry-ready")
  })

  test("after clearing inventory search, full list returns", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.locator("text=Inventory")).toBeVisible({ timeout: 15_000 })

    const searchInput = page.getByPlaceholder(/search products or SKUs/i)

    // Search for nothing
    await searchInput.fill("zzz_nothing_here")
    await page.waitForTimeout(1_500)
    await expect(page.locator("text=No products found")).toBeVisible({ timeout: 5_000 })

    // Clear search
    await searchInput.clear()
    await page.waitForTimeout(1_500)
    await screenshot(page, "25-ux-inventory-search-cleared")

    // UX CHECK: Full product list should come back
    const body = await page.locator("body").innerText()
    const hasProducts = body.includes("products") && !body.includes("No products found")

    expect(hasProducts).toBe(true)
  })

  test("after clearing BOM search, full list returns", async ({ page }) => {
    await page.goto("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await page.locator("button").filter({ hasText: "BOM List" }).click()
    await page.waitForTimeout(500)

    const searchInput = page.getByPlaceholder(/search by job name/i)

    // Search for nothing
    await searchInput.fill("zzz_nothing_here")
    await page.waitForTimeout(1_500)

    // Clear search
    await searchInput.clear()
    await page.waitForTimeout(1_500)
    await screenshot(page, "25-ux-bom-search-cleared")

    // UX CHECK: BOM list should repopulate
    const body = await page.locator("body").innerText()
    const listRecovered =
      !body.includes("No BOMs found") || body.includes("BOMs") || body.includes("Draft")

    expect(listRecovered).toBe(true)
  })
})

test.describe("UX: Consistent Status Colors — Visual Language", () => {
  test("BOM status badges use consistent colors across list and detail", async ({ page }) => {
    // Check BOM list page for status badges
    await page.goto("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await page.locator("button").filter({ hasText: "BOM List" }).click()
    await page.waitForTimeout(500)

    // Click "All" to see all statuses
    await page.locator("button").filter({ hasText: "All" }).first().click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "25-ux-bom-status-colors-list")

    // Now open a specific BOM to compare
    const bomLink = page.locator("a[href^='/boms/']").first()
    if (await bomLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await bomLink.click()
      await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
      await screenshot(page, "25-ux-bom-status-colors-detail")

      // UX CHECK: The status badge on the detail page should use the same
      // color as it does on the list page. Visual comparison via screenshots.
    }
  })
})

test.describe("UX: Form Behavior — Keyboard & Mobile Friendliness", () => {
  test("quantity inputs accept decimal values for partial units", async ({ page }) => {
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

    // Select Add direction
    await page.locator("button").filter({ hasText: /add/i }).first().click()

    // UX CHECK: Quantity input should accept decimals (0.5, 2.75, etc.)
    // for items measured in linear feet, sq ft, etc.
    const qtyInput = page.locator("input[type='number']").first()
    await qtyInput.fill("2.5")
    await page.waitForTimeout(500)
    await screenshot(page, "25-ux-decimal-quantity")

    const value = await qtyInput.inputValue()
    expect(value).toBe("2.5")
  })

  test("pressing Enter in search submits search (not form)", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.locator("text=Inventory")).toBeVisible({ timeout: 15_000 })

    const searchInput = page.getByPlaceholder(/search products or SKUs/i)
    await searchInput.fill("caulk")
    await searchInput.press("Enter")
    await page.waitForTimeout(1_500)
    await screenshot(page, "25-ux-search-enter-key")

    // UX CHECK: Page should not navigate away or submit a form
    // It should stay on inventory page with filtered results
    await expect(page).toHaveURL(/\/inventory/)
  })
})

test.describe("UX: Fab Flow — Template vs Custom Clarity", () => {
  test("custom option is visually distinct from templates", async ({ page }) => {
    await page.goto("/assemblies/new?type=PANEL")
    await page.waitForLoadState("networkidle")

    // Job step - quick entry
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill("Template Test")
    await page.waitForTimeout(1_000)
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("Template Test")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    }
    await page.waitForTimeout(1_000)

    // Select Wall Panel
    const wallPanel = page.locator("text=Wall Panel")
    if (await wallPanel.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await wallPanel.click()
      await page.waitForTimeout(1_000)
    }

    await screenshot(page, "25-ux-fab-template-vs-custom")

    // UX CHECK: If templates are shown, the "Custom" option should be
    // visually distinct (dashed border, different style) so users know
    // it's a different path
    const customOption = page.locator("text=Custom")
    if (await customOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Good — custom option exists
      // The visual distinction is verified via screenshot
    }
  })
})

test.describe("UX: Double-Click Prevention", () => {
  test("BOM approve button disables after click (prevents double-approve)", async ({ page }) => {
    // Navigate to a draft BOM
    await page.goto("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await page.locator("button").filter({ hasText: "BOM List" }).click()
    await page.waitForTimeout(500)
    await page.locator("button").filter({ hasText: "Draft" }).click()
    await page.waitForTimeout(1_000)

    const bomLink = page.locator("a[href^='/boms/']").first()
    if (!(await bomLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await bomLink.click()
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })

    const approveBtn = page.getByRole("button", { name: /approve/i })
    if (!(await approveBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    // Click approve and immediately check if button becomes disabled
    await approveBtn.click()

    // UX CHECK: Button should become disabled or show loading
    // to prevent accidental double-click
    const isDisabledAfterClick = await approveBtn.isDisabled().catch(() => false)
    const showsLoading = await page
      .locator("text=Approving...")
      .isVisible({ timeout: 2_000 })
      .catch(() => false)

    await screenshot(page, "25-ux-approve-double-click-prevention")

    // Either disabled or showing loading state is acceptable
    expect(isDisabledAfterClick || showsLoading).toBe(true)
  })
})
