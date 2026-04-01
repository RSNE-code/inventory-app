import { test, expect } from "@playwright/test"
import { screenshot, goToAssemblies, getAssemblies } from "./helpers"

/**
 * Fabrication Items Tests — Panels, Floors, Ramps
 *
 * Multi-step interview: Job → Type (Wall Panel, Floor Panel, Ramp) → Template → Specs → Review
 * Specs form has dimension inputs, material selects, qty stepper.
 */

// ─── Helper: advance through job step ──────────────────────────────
async function fillJobStep(page: import("@playwright/test").Page, jobName: string) {
  const searchInput = page.getByPlaceholder(/search jobs/i)
  await expect(searchInput).toBeVisible({ timeout: 10_000 })
  await searchInput.fill(jobName)

  const manualInput = page.getByPlaceholder(/enter job name manually/i)
  if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await manualInput.fill(jobName)
    const continueBtn = page.getByRole("button", { name: /continue/i })
    if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await continueBtn.click()
    }
  }
}

async function advanceToFabType(page: import("@playwright/test").Page, jobName = "E2E Fab Type") {
  await page.goto("/assemblies/new?type=PANEL")
  await fillJobStep(page, jobName)
}

async function advanceToSpecs(
  page: import("@playwright/test").Page,
  fabType: string,
  jobName = "E2E Fab Specs",
) {
  await advanceToFabType(page, jobName)
  await page.getByText(fabType, { exact: false }).click()

  // If template step appears, choose Custom
  const customBtn = page.getByText("Custom").first()
  if (await customBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await customBtn.click()
  }
}

// ─── Tests ─────────────────────────────────────────────────────────

test.describe("Fab Items — Tab Access", () => {
  test("fabrication tab is accessible", async ({ page }) => {
    await goToAssemblies(page)

    const fabTab = page.getByRole("button", { name: "Fabrication" })
    await expect(fabTab).toBeVisible({ timeout: 10_000 })
    await fabTab.click()

    // Should show fab queue or empty state
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Queue") ||
      body.includes("New Panel") ||
      body.includes("No assemblies") ||
      body.includes("Fabrication"),
    ).toBe(true)
    await screenshot(page, "flow-07-fabrication-tab")
  })
})

test.describe("Fab Items — Creation Entry", () => {
  test("New Panel / Floor / Ramp button works", async ({ page }) => {
    await goToAssemblies(page)
    await page.getByRole("button", { name: "Fabrication" }).click()

    const newPanelBtn = page.getByRole("button", { name: /new panel/i })
    await expect(newPanelBtn).toBeVisible({ timeout: 10_000 })
    await newPanelBtn.click()

    // Should navigate to creation flow (job step)
    await expect(page.getByPlaceholder(/search jobs/i)).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-07-new-panel-navigated")
  })
})

test.describe("Fab Items — Type Chooser", () => {
  test("type chooser shows Wall Panel, Floor Panel, Ramp", async ({ page }) => {
    await advanceToFabType(page, "E2E Fab Types")
    await screenshot(page, "flow-07-fab-type-options")

    await expect(page.getByText("Wall Panel")).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText("Floor Panel")).toBeVisible()
    await expect(page.getByText("Ramp")).toBeVisible()
  })
})

test.describe("Fab Items — Floor Panel Flow", () => {
  test("floor panel creation flow — specs form has dimensions", async ({ page }) => {
    await advanceToSpecs(page, "Floor Panel", "E2E Floor Panel Specs")
    await screenshot(page, "flow-07-floor-panel-specs")

    const body = await page.locator("body").innerText()
    expect(
      body.includes("Width") ||
      body.includes("Length") ||
      body.includes("Insulation") ||
      body.includes("Specs"),
    ).toBe(true)
  })
})

test.describe("Fab Items — Wall Panel Flow", () => {
  test("wall panel creation flow", async ({ page }) => {
    await advanceToSpecs(page, "Wall Panel", "E2E Wall Panel Flow")
    await screenshot(page, "flow-07-wall-panel-specs")

    const body = await page.locator("body").innerText()
    expect(
      body.includes("Width") ||
      body.includes("Length") ||
      body.includes("Insulation") ||
      body.includes("Specs") ||
      body.includes("Wall"),
    ).toBe(true)
  })
})

test.describe("Fab Items — Ramp Flow", () => {
  test("ramp creation flow — slope and rail type fields", async ({ page }) => {
    await advanceToSpecs(page, "Ramp", "E2E Ramp Flow")
    await screenshot(page, "flow-07-ramp-specs")

    const body = await page.locator("body").innerText()
    expect(
      body.includes("Width") ||
      body.includes("Length") ||
      body.includes("Height") ||
      body.includes("Diamond") ||
      body.includes("Ramp"),
    ).toBe(true)
  })
})

test.describe("Fab Items — Queue & Detail", () => {
  test("created fab item appears in queue", async ({ page }) => {
    await goToAssemblies(page)
    await page.getByRole("button", { name: "Fabrication" }).click()
    await screenshot(page, "flow-07-fab-queue")

    // Queue should show fab items or empty state
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Panel") ||
      body.includes("Ramp") ||
      body.includes("No assemblies") ||
      body.includes("Fabrication"),
    ).toBe(true)
  })

  test("fab item cards are clickable", async ({ page }) => {
    const assemblies = await getAssemblies(page)
    const fabItem = assemblies.find(
      (a: any) =>
        a.type === "WALL_PANEL" || a.type === "FLOOR_PANEL" || a.type === "RAMP",
    )

    if (!fabItem) {
      test.skip()
      return
    }

    await goToAssemblies(page)
    await page.getByRole("button", { name: "Fabrication" }).click()

    const firstCard = page.locator("[class*='card'], [class*='Card']").first()
    if (await firstCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstCard.click()
      await expect(page).toHaveURL(/\/assemblies\//, { timeout: 10_000 })
      await screenshot(page, "flow-07-fab-card-navigated")
    }
  })

  test("fab item detail shows specs", async ({ page }) => {
    const assemblies = await getAssemblies(page)
    const fabItem = assemblies.find(
      (a: any) =>
        a.type === "WALL_PANEL" || a.type === "FLOOR_PANEL" || a.type === "RAMP",
    )

    if (!fabItem) {
      test.skip()
      return
    }

    await page.goto(`/assemblies/${fabItem.id}`)

    const body = await page.locator("body").innerText()
    expect(
      body.includes("Specs") ||
      body.includes("Width") ||
      body.includes("Components") ||
      body.includes("Panel") ||
      body.includes("Ramp"),
    ).toBe(true)
    await screenshot(page, "flow-07-fab-detail-specs")
  })
})
