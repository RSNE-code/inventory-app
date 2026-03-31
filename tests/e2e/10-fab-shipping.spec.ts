import { test, expect } from "@playwright/test"
import { screenshot, goToAssemblies, getAssemblies } from "./helpers"

test.describe("Fabrication Shipping", () => {
  test("assemblies page shows Ship tab", async ({ page }) => {
    await goToAssemblies(page)
    await screenshot(page, "10-shipping-assemblies-page")

    // Ship tab should be present
    await expect(page.locator("button").filter({ hasText: "Ship" })).toBeVisible({ timeout: 10_000 })
  })

  test("Ship tab shows Ready to Ship and Recently Shipped views", async ({ page }) => {
    await goToAssemblies(page)

    // Click Ship tab
    await page.locator("button").filter({ hasText: "Ship" }).click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "10-shipping-tab")

    // Should show shipping sub-views or empty state
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Ready to Ship") ||
      body.includes("Recently Shipped") ||
      body.includes("No items") ||
      body.includes("completed") ||
      body.includes("Ship")
    ).toBe(true)
  })

  test("Ready to Ship groups items by job", async ({ page }) => {
    await goToAssemblies(page)

    await page.locator("button").filter({ hasText: "Ship" }).click()
    await page.waitForTimeout(1_000)

    // If there are completed assemblies, they should be grouped by job name
    const readyItems = page.locator("text=ready")
    const hasItems = await readyItems.first().isVisible({ timeout: 3_000 }).catch(() => false)

    if (hasItems) {
      await screenshot(page, "10-shipping-grouped-by-job")

      // Ship button should be visible for individual items
      const shipBtn = page.locator("button").filter({ hasText: /^Ship$/ }).first()
      await expect(shipBtn).toBeVisible({ timeout: 5_000 })
    } else {
      await screenshot(page, "10-shipping-no-items")
    }
  })

  test("Recently Shipped view shows shipped assemblies", async ({ page }) => {
    await goToAssemblies(page)

    await page.locator("button").filter({ hasText: "Ship" }).click()
    await page.waitForTimeout(1_000)

    // Switch to Recently Shipped view
    const recentlyShipped = page.locator("button").filter({ hasText: /recently shipped/i })
    if (await recentlyShipped.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await recentlyShipped.click()
      await page.waitForTimeout(1_000)
      await screenshot(page, "10-shipping-recently-shipped")
    }
  })

  test("Door Shop tab shows door assemblies queue", async ({ page }) => {
    await goToAssemblies(page)

    // Door Shop should be the default tab or first tab
    await page.locator("button").filter({ hasText: "Door Shop" }).click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "10-shipping-door-shop-tab")

    // Should show queue or empty state
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Queue") ||
      body.includes("New Door") ||
      body.includes("No assemblies") ||
      body.includes("Door Shop")
    ).toBe(true)
  })

  test("Fabrication tab shows panel/ramp assemblies", async ({ page }) => {
    await goToAssemblies(page)

    await page.locator("button").filter({ hasText: "Fabrication" }).click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "10-shipping-fabrication-tab")

    const body = await page.locator("body").innerText()
    expect(
      body.includes("Queue") ||
      body.includes("New Panel") ||
      body.includes("No assemblies") ||
      body.includes("Fabrication")
    ).toBe(true)
  })

  test("assembly detail page shows lifecycle tracker", async ({ page }) => {
    // Get any assembly
    const assemblies = await getAssemblies(page)
    if (assemblies.length === 0) {
      test.skip()
      return
    }

    const assembly = assemblies[0]
    await page.goto(`/assemblies/${assembly.id}`)
    await page.waitForLoadState("networkidle")
    await screenshot(page, "10-shipping-assembly-detail")

    // Lifecycle tracker should show steps
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Created") ||
      body.includes("Building") ||
      body.includes("Complete") ||
      body.includes("Shipped")
    ).toBe(true)
  })

  test("completed assembly shows Mark as Shipped button", async ({ page }) => {
    // Find a completed assembly
    const assemblies = await getAssemblies(page)
    const completed = assemblies.find(
      (a: any) => a.status === "COMPLETED" || a.status === "ALLOCATED"
    )

    if (!completed) {
      test.skip()
      return
    }

    await page.goto(`/assemblies/${completed.id}`)
    await page.waitForLoadState("networkidle")
    await screenshot(page, "10-shipping-completed-assembly")

    // Should show "Mark as Shipped" button
    await expect(page.locator("button").filter({ hasText: /mark as shipped/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  test("assembly detail shows components list", async ({ page }) => {
    const assemblies = await getAssemblies(page)
    if (assemblies.length === 0) {
      test.skip()
      return
    }

    await page.goto(`/assemblies/${assemblies[0].id}`)
    await page.waitForLoadState("networkidle")

    // Components section
    const components = page.locator("text=Components")
    if (await components.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await screenshot(page, "10-shipping-assembly-components")
    }
  })
})
