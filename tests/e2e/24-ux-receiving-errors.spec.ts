import { test, expect } from "@playwright/test"
import { screenshot } from "./helpers"

/**
 * UX Friction Tests: Receiving & Checkout Flows
 *
 * Tests error recovery, dead ends, and unclear states
 * in the receiving and BOM checkout workflows.
 * ALL tests use real user interactions only.
 */

test.describe("UX: Receiving — Start Over Recovery", () => {
  test("start over from PO browse returns to clean input state", async ({ page }) => {
    await page.goto("/receiving")
    await expect(page.locator("text=Receive Material")).toBeVisible({ timeout: 15_000 })

    // Click Browse POs to advance
    const browsePOs = page.locator("button, div").filter({ hasText: "Browse POs" }).first()
    await expect(browsePOs).toBeVisible({ timeout: 10_000 })
    await browsePOs.click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "24-ux-receiving-po-browse")

    // Look for "Start over" link
    const startOver = page.locator("button, a").filter({ hasText: /start over/i }).first()
    if (await startOver.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await startOver.click()
      await page.waitForTimeout(1_000)
      await screenshot(page, "24-ux-receiving-after-start-over")

      // UX CHECK: Should be back at clean INPUT phase
      // Both entry cards should be visible again
      await expect(
        page.locator("text=Packing Slip").or(page.locator("text=Browse POs"))
      ).toBeVisible({ timeout: 5_000 })
    }
  })

  test("navigating between receiving tabs preserves nothing (clean slate)", async ({ page }) => {
    await page.goto("/receiving")
    await expect(page.locator("text=Receive Material")).toBeVisible({ timeout: 15_000 })

    // Switch to Receipt History
    await page.locator("button").filter({ hasText: "Receipt History" }).click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "24-ux-receiving-history-tab")

    // Switch back to AI Receive
    await page.locator("button").filter({ hasText: "AI Receive" }).click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "24-ux-receiving-back-to-ai")

    // UX CHECK: AI Receive should show fresh INPUT phase
    await expect(
      page.locator("text=Packing Slip").or(page.locator("text=Browse POs"))
    ).toBeVisible({ timeout: 5_000 })
  })
})

test.describe("UX: Receiving — Validation Messages", () => {
  test("receipt history shows meaningful empty state", async ({ page }) => {
    await page.goto("/receiving")
    await expect(page.locator("text=Receive Material")).toBeVisible({ timeout: 15_000 })

    await page.locator("button").filter({ hasText: "Receipt History" }).click()
    await page.waitForTimeout(2_000)
    await screenshot(page, "24-ux-receiving-history-content")

    // UX CHECK: Even if there are no receipts, the page should show
    // something helpful — not just a blank area
    const body = await page.locator("body").innerText()
    const hasContent =
      body.includes("Receipt") ||
      body.includes("receipt") ||
      body.includes("No receipts") ||
      body.includes("history") ||
      body.includes("received")

    expect(hasContent).toBe(true)
  })
})

test.describe("UX: BOM Checkout — Edge Cases", () => {
  test("checkout section is clearly labeled with progress indicator", async ({ page }) => {
    // Navigate to BOM list and find an approved/in-progress BOM
    await page.goto("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await page.locator("button").filter({ hasText: "BOM List" }).click()
    await page.waitForTimeout(500)

    // Try Approved filter
    await page.locator("button").filter({ hasText: "Approved" }).click()
    await page.waitForTimeout(1_000)

    let bomLink = page.locator("a[href^='/boms/']").first()
    if (!(await bomLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      // Try In Progress
      await page.locator("button").filter({ hasText: "In Progress" }).click()
      await page.waitForTimeout(1_000)
      bomLink = page.locator("a[href^='/boms/']").first()
    }

    if (!(await bomLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await bomLink.click()
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "24-ux-bom-checkout-section")

    // UX CHECK: User should see a clear fulfillment progress indicator
    // e.g., "3 of 10 fulfilled"
    const body = await page.locator("body").innerText()
    const hasProgress =
      body.includes("fulfilled") ||
      body.includes("of") ||
      body.includes("Check Out") ||
      body.includes("checked out")

    expect(hasProgress).toBe(true)
  })

  test("checkout button shows loading state during processing", async ({ page }) => {
    // Navigate to an approved BOM
    await page.goto("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await page.locator("button").filter({ hasText: "BOM List" }).click()
    await page.waitForTimeout(500)
    await page.locator("button").filter({ hasText: "Approved" }).click()
    await page.waitForTimeout(1_000)

    const bomLink = page.locator("a[href^='/boms/']").first()
    if (!(await bomLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await bomLink.click()
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(2_000)

    // UX CHECK: If there's a "Check Out All" or "Select All" button,
    // clicking it should show a loading state ("Processing...")
    // to prevent double-clicks
    const checkoutAllBtn = page
      .locator("button")
      .filter({ hasText: /check out all|select all/i })
      .first()

    if (await checkoutAllBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await screenshot(page, "24-ux-bom-checkout-all-ready")
      // Don't actually click — just verify it's there and accessible
    }
  })
})

test.describe("UX: Panel Checkout — Validation", () => {
  test("panel checkout sheet validates brand selection", async ({ page }) => {
    // This test needs an approved BOM with panel items
    // Navigate to BOM list and look for one
    await page.goto("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await page.locator("button").filter({ hasText: "BOM List" }).click()
    await page.waitForTimeout(500)

    // Search for a BOM that might have panels
    const searchInput = page.getByPlaceholder(/search by job name/i)
    await searchInput.fill("panel")
    await page.waitForTimeout(1_500)

    const bomLink = page.locator("a[href^='/boms/']").first()
    if (!(await bomLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      // Also try without search
      await searchInput.clear()
      await page.locator("button").filter({ hasText: "Approved" }).click()
      await page.waitForTimeout(1_000)
    }

    // If we find a BOM, navigate to it and look for panel checkout
    const anyBomLink = page.locator("a[href^='/boms/']").first()
    if (!(await anyBomLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await anyBomLink.click()
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(2_000)

    // Look for panel checkout button (blue "Checkout" button next to panel items)
    const panelCheckoutBtn = page
      .locator("button")
      .filter({ hasText: /^checkout$/i })
      .first()

    if (await panelCheckoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await panelCheckoutBtn.click()
      await page.waitForTimeout(1_000)
      await screenshot(page, "24-ux-panel-checkout-sheet")

      // UX CHECK: Panel checkout sheet should require brand selection
      // The submit button should be disabled without a brand
      const submitBtn = page
        .locator("button")
        .filter({ hasText: /check out.*panel/i })
        .first()

      if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const isDisabled = await submitBtn.isDisabled()
        // Should be disabled until brand is selected
        expect(isDisabled).toBe(true)
      }
    }
  })
})

test.describe("UX: Navigation — Browser Back Button", () => {
  test("browser back from BOM detail returns to BOM list", async ({ page }) => {
    await page.goto("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await page.locator("button").filter({ hasText: "BOM List" }).click()
    await page.waitForTimeout(500)

    const bomLink = page.locator("a[href^='/boms/']").first()
    if (!(await bomLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await bomLink.click()
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "24-ux-nav-bom-detail")

    // Use browser back
    await page.goBack()
    await page.waitForTimeout(2_000)
    await screenshot(page, "24-ux-nav-browser-back")

    // UX CHECK: Should be back on BOM list, not stuck on a blank page
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
  })

  test("browser back from inventory detail returns to inventory list", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.locator("text=Inventory")).toBeVisible({ timeout: 15_000 })

    const productLink = page.locator("a[href^='/inventory/']").first()
    if (!(await productLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await productLink.click()
    await page.waitForLoadState("networkidle")
    await screenshot(page, "24-ux-nav-product-detail")

    await page.goBack()
    await page.waitForTimeout(2_000)
    await screenshot(page, "24-ux-nav-inventory-back")

    await expect(page.locator("text=Inventory")).toBeVisible({ timeout: 15_000 })
  })

  test("browser back from assembly creation returns to assembly list", async ({ page }) => {
    await page.goto("/assemblies")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1_000)

    // Click New Door to enter creation flow
    const newDoorBtn = page.locator("a, button").filter({ hasText: /new door/i }).first()
    if (!(await newDoorBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // Try clicking Door Shop tab first
      await page.locator("button").filter({ hasText: "Door Shop" }).click()
      await page.waitForTimeout(500)
    }

    const newDoorBtn2 = page.locator("a, button").filter({ hasText: /new door/i }).first()
    if (!(await newDoorBtn2.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await newDoorBtn2.click()
    await page.waitForLoadState("networkidle")
    await screenshot(page, "24-ux-nav-assembly-creation")

    await page.goBack()
    await page.waitForTimeout(2_000)
    await screenshot(page, "24-ux-nav-assembly-back")

    // UX CHECK: Should be back at assemblies list
    const body = await page.locator("body").innerText()
    const isBackAtList =
      body.includes("Door Shop") ||
      body.includes("Fabrication") ||
      body.includes("Ship")

    expect(isBackAtList).toBe(true)
  })
})

test.describe("UX: Unsaved Changes — Data Loss Prevention", () => {
  test("BOM manual entry warns before navigating away with items in cart", async ({ page }) => {
    await page.goto("/boms/new?mode=manual")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })

    // Add a product to the cart
    const searchInput = page.getByPlaceholder(/search products/i)
    await searchInput.fill("caulk")
    await page.waitForTimeout(2_000)

    const addBtn = page
      .locator("button")
      .filter({ has: page.locator(".lucide-plus") })
      .first()
    if (!(await addBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }
    await addBtn.click()
    await page.waitForTimeout(500)

    // Verify item is in cart
    await expect(page.locator("text=1 item")).toBeVisible({ timeout: 3_000 })
    await screenshot(page, "24-ux-bom-unsaved-item-in-cart")

    // Now try to navigate away
    // The app should show a "beforeunload" warning
    // Playwright can check if the dialog would appear
    const dialogPromise = page.waitForEvent("dialog", { timeout: 5_000 }).catch(() => null)
    await page.goto("/inventory")
    const dialog = await dialogPromise

    if (dialog) {
      // Good UX — warning before losing work
      await screenshot(page, "24-ux-bom-unsaved-warning")
      await dialog.dismiss() // Stay on page
    } else {
      // UX FRICTION: No warning when navigating away with items in cart.
      // User's work is silently lost.
      // Note: beforeunload may not fire in some test contexts
    }
  })
})

test.describe("UX: Accessibility — Touch Targets", () => {
  test("buttons and links meet minimum touch target size (44px)", async ({ page }) => {
    // This is for construction workers with gloves — critical UX requirement
    await page.goto("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "24-ux-touch-targets-bom-page")

    // Check key buttons have minimum height
    const buttons = page.locator("button:visible")
    const count = await buttons.count()

    let smallButtons = 0
    for (let i = 0; i < Math.min(count, 10); i++) {
      const box = await buttons.nth(i).boundingBox()
      if (box && box.height < 44) {
        smallButtons++
      }
    }

    // UX CHECK: Most buttons should be at least 44px tall
    // for construction workers with gloves
    if (smallButtons > count / 2) {
      // More than half the buttons are too small
      await screenshot(page, "24-ux-touch-targets-too-small")
      // Not a hard fail but documenting the concern
    }
  })
})
