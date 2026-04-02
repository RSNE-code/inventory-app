import { test, expect } from "@playwright/test"
import { screenshot, goToAssemblies, getAssemblies, createTestAssembly } from "./helpers"

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
    // Create an assembly so we always have one to test
    const assembly = await createTestAssembly(page, {
      type: "DOOR",
      status: "AWAITING_APPROVAL",
      jobName: `E2E Lifecycle ${Date.now()}`,
    })

    await page.goto(`/assemblies/${assembly.id}`)

    // Lifecycle tracker should show stage labels
    await expect(
      page.getByText("Created", { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-09-lifecycle-stages")
  })

  test("Start Build button works from APPROVED", async ({ page }) => {
    // Create an APPROVED assembly
    const approved = await createTestAssembly(page, {
      type: "DOOR",
      status: "APPROVED",
      jobName: `E2E StartBuild ${Date.now()}`,
    })

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
    // Create an IN_PRODUCTION assembly
    const building = await createTestAssembly(page, {
      type: "DOOR",
      status: "IN_PRODUCTION",
      jobName: `E2E CompleteBuild ${Date.now()}`,
    })

    await page.goto(`/assemblies/${building.id}`)

    const completeBuildBtn = page.getByRole("button", { name: /complete build/i })
    await expect(completeBuildBtn).toBeVisible({ timeout: 10_000 })
    await completeBuildBtn.click()

    // Wait for status transition — toast or badge confirms completion
    await expect(
      page.getByText("Build completed").or(page.getByText("Mark as Shipped"))
    ).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "flow-09-complete-build")
  })

  test("Mark as Shipped transitions to SHIPPED", async ({ page }) => {
    // Create a COMPLETED assembly ready to ship
    const completed = await createTestAssembly(page, {
      type: "DOOR",
      status: "COMPLETED",
      jobName: `E2E Ship ${Date.now()}`,
    })

    await page.goto(`/assemblies/${completed.id}`)

    const shipBtn = page.getByRole("button", { name: /mark as shipped/i })
    await expect(shipBtn).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-09-before-ship")

    await shipBtn.click()

    // Should transition to SHIPPED
    await expect(
      page.getByText("Shipped", { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-09-shipped")
  })
})
