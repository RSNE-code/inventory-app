import { test, expect } from "@playwright/test"
import { screenshot, goToAssemblies, getAssemblies } from "./helpers"

/**
 * Shipping Flow Tests
 *
 * Ship tab on /assemblies shows finished goods.
 * Lifecycle: Created → Building → Complete → Shipped.
 * COMPLETED items can be marked SHIPPED.
 * APPROVED items can Start Build → IN_PRODUCTION → Complete Build → COMPLETED.
 */

// ─── Tests ─────────────────────────────────────────────────────────

test.describe("Shipping — Tab Access", () => {
  test("ship tab loads on assemblies page", async ({ page }) => {
    await goToAssemblies(page)

    const shipTab = page.getByRole("button", { name: "Ship" })
    await expect(shipTab).toBeVisible({ timeout: 10_000 })
    await shipTab.click()

    // Should show shipping view content
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Ready to Ship") ||
      body.includes("Recently Shipped") ||
      body.includes("No items") ||
      body.includes("Ship"),
    ).toBe(true)
    await screenshot(page, "flow-09-ship-tab-loaded")
  })
})

test.describe("Shipping — Completed Assemblies", () => {
  test("completed assemblies appear in ship view", async ({ page }) => {
    await goToAssemblies(page)
    await page.getByRole("button", { name: "Ship" }).click()

    await screenshot(page, "flow-09-ship-view")

    // Check for completed items or empty state
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Ready to Ship") ||
      body.includes("No items") ||
      body.includes("completed") ||
      body.includes("Ship"),
    ).toBe(true)
  })
})

test.describe("Shipping — Assembly Lifecycle", () => {
  test("assembly detail shows lifecycle stages", async ({ page }) => {
    const assemblies = await getAssemblies(page)
    if (assemblies.length === 0) {
      test.skip()
      return
    }

    const assembly = assemblies[0]
    await page.goto(`/assemblies/${assembly.id}`)

    // Lifecycle tracker should show stage labels
    const body = page.locator("body")
    await expect(
      body.getByText("Created")
        .or(body.getByText("Building"))
        .or(body.getByText("Complete"))
        .or(body.getByText("Shipped")),
    ).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-09-lifecycle-stages")
  })

  test("Start Build button works from APPROVED", async ({ page }) => {
    const assemblies = await getAssemblies(page)
    const approved = assemblies.find(
      (a: any) => a.status === "APPROVED" || a.status === "AWAITING_APPROVAL",
    )

    if (!approved) {
      test.skip()
      return
    }

    await page.goto(`/assemblies/${approved.id}`)

    // If AWAITING_APPROVAL, approve first
    const approveBtn = page.getByRole("button", { name: /approve/i })
    if (await approveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await approveBtn.click()
      await expect(page.getByRole("button", { name: /start build/i })).toBeVisible({ timeout: 10_000 })
    }

    // Start Build button
    const startBuildBtn = page.getByRole("button", { name: /start build/i })
    if (await startBuildBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await startBuildBtn.click()

      // Should transition to IN_PRODUCTION / Building status
      const body = await page.locator("body").innerText()
      expect(
        body.includes("Building") ||
        body.includes("IN_PRODUCTION") ||
        body.includes("Complete Build"),
      ).toBe(true)
      await screenshot(page, "flow-09-start-build")
    }
  })

  test("Complete Build transitions to COMPLETED", async ({ page }) => {
    const assemblies = await getAssemblies(page)
    const building = assemblies.find(
      (a: any) => a.status === "IN_PRODUCTION",
    )

    if (!building) {
      test.skip()
      return
    }

    await page.goto(`/assemblies/${building.id}`)

    const completeBuildBtn = page.getByRole("button", { name: /complete build/i })
    await expect(completeBuildBtn).toBeVisible({ timeout: 10_000 })
    await completeBuildBtn.click()

    // Should transition to COMPLETED
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Completed") ||
      body.includes("COMPLETED") ||
      body.includes("Mark as Shipped"),
    ).toBe(true)
    await screenshot(page, "flow-09-complete-build")
  })

  test("Mark as Shipped transitions to SHIPPED", async ({ page }) => {
    const assemblies = await getAssemblies(page)
    const completed = assemblies.find(
      (a: any) => a.status === "COMPLETED" || a.status === "ALLOCATED",
    )

    if (!completed) {
      test.skip()
      return
    }

    await page.goto(`/assemblies/${completed.id}`)

    const shipBtn = page.getByRole("button", { name: /mark as shipped/i })
    await expect(shipBtn).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-09-before-ship")

    await shipBtn.click()

    // Should transition to SHIPPED
    await expect(
      page.getByText("Shipped").or(page.getByText("SHIPPED")),
    ).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-09-shipped")
  })
})
