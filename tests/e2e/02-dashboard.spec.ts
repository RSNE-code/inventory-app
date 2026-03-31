import { test, expect } from "@playwright/test"
import { screenshot, goToDashboard, collectConsoleErrors, filterCriticalErrors } from "./helpers"

test.describe("Dashboard Navigation", () => {
  test("dashboard loads with greeting and key sections", async ({ page }) => {
    await goToDashboard(page)
    await screenshot(page, "02-dashboard-loaded")

    // Greeting should be visible (Good morning/afternoon/evening)
    await expect(
      page.locator("text=Good morning").or(page.locator("text=Good afternoon")).or(page.locator("text=Good evening"))
    ).toBeVisible({ timeout: 15_000 })
  })

  test("dashboard shows work pipelines section", async ({ page }) => {
    await goToDashboard(page)

    // BOMs pipeline card
    await expect(page.locator("text=BOMs")).toBeVisible({ timeout: 15_000 })

    // Fabrication pipeline card
    await expect(page.locator("text=Fabrication")).toBeVisible()

    await screenshot(page, "02-dashboard-pipelines")
  })

  test("dashboard shows stock summary", async ({ page }) => {
    await goToDashboard(page)

    // Inventory value section
    await expect(
      page.locator("text=INVENTORY VALUE").or(page.locator("text=Inventory Value"))
    ).toBeVisible({ timeout: 15_000 })

    await screenshot(page, "02-dashboard-stock-summary")
  })

  test("dashboard shows recent activity", async ({ page }) => {
    await goToDashboard(page)

    await expect(page.locator("text=Recent Activity")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "02-dashboard-recent-activity")
  })

  test("navigate to inventory from sidebar/bottom nav", async ({ page }) => {
    await goToDashboard(page)

    // Click inventory nav item
    const inventoryLink = page.locator("a[href='/inventory']").first()
    await expect(inventoryLink).toBeVisible({ timeout: 10_000 })
    await inventoryLink.click()

    await expect(page).toHaveURL("/inventory")
    await expect(page.locator("text=Inventory")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "02-dashboard-nav-to-inventory")
  })

  test("navigate to BOMs from sidebar/bottom nav", async ({ page }) => {
    await goToDashboard(page)

    const bomsLink = page.locator("a[href='/boms']").first()
    await expect(bomsLink).toBeVisible({ timeout: 10_000 })
    await bomsLink.click()

    await expect(page).toHaveURL("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "02-dashboard-nav-to-boms")
  })

  test("navigate to assemblies from sidebar/bottom nav", async ({ page }) => {
    await goToDashboard(page)

    const assembliesLink = page.locator("a[href='/assemblies']").first()
    await expect(assembliesLink).toBeVisible({ timeout: 10_000 })
    await assembliesLink.click()

    await expect(page).toHaveURL("/assemblies")
    await screenshot(page, "02-dashboard-nav-to-assemblies")
  })

  test("navigate to receiving from sidebar/bottom nav", async ({ page }) => {
    await goToDashboard(page)

    const receivingLink = page.locator("a[href='/receiving']").first()
    await expect(receivingLink).toBeVisible({ timeout: 10_000 })
    await receivingLink.click()

    await expect(page).toHaveURL("/receiving")
    await expect(page.locator("text=Receive Material")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "02-dashboard-nav-to-receiving")
  })

  test("BOMs pipeline card links to BOM list", async ({ page }) => {
    await goToDashboard(page)

    // Click the BOMs pipeline card
    const bomsCard = page.locator("a[href='/boms']").filter({ hasText: "BOMs" }).first()
    if (await bomsCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await bomsCard.click()
      await expect(page).toHaveURL("/boms")
      await screenshot(page, "02-dashboard-boms-card-link")
    }
  })

  test("low stock link navigates to filtered inventory", async ({ page }) => {
    await goToDashboard(page)

    // Look for "View all low stock" link
    const lowStockLink = page.locator("text=View all low stock").first()
    if (await lowStockLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await lowStockLink.click()
      await expect(page).toHaveURL(/\/inventory\?status=low/)
      await screenshot(page, "02-dashboard-low-stock-link")
    }
  })

  test("dashboard has no critical console errors", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await goToDashboard(page)
    await page.waitForTimeout(3_000)

    const critical = filterCriticalErrors(errors)
    expect(critical).toEqual([])
  })

  test("dashboard loads within acceptable time", async ({ page }) => {
    const start = Date.now()
    await goToDashboard(page)

    // Wait for main content
    await expect(
      page.locator("text=Good morning").or(page.locator("text=Good afternoon")).or(page.locator("text=Good evening"))
    ).toBeVisible({ timeout: 15_000 })

    const loadTime = Date.now() - start
    // Dashboard should load within 10 seconds
    expect(loadTime).toBeLessThan(10_000)
  })
})
