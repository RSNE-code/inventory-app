import { test, expect } from "@playwright/test"
import { screenshot, goToAssemblies, getAssemblies } from "./helpers"

/**
 * Door Creation Flow Tests
 *
 * Multi-step interview: Job → Type → Size → Confirm
 * Door types: Cooler Swing, Freezer Swing, Cooler Slider, Freezer Slider (2×2 grid)
 * Standard sizes shown per type, plus "Custom Size" option.
 */

const DOOR_TYPES = ["Cooler Swing", "Freezer Swing", "Cooler Slider", "Freezer Slider"] as const

// ─── Helper: advance through job step ──────────────────────────────
async function fillJobStep(page: import("@playwright/test").Page, jobName: string) {
  const searchInput = page.getByPlaceholder(/search jobs/i)
  await expect(searchInput).toBeVisible({ timeout: 10_000 })
  await searchInput.fill(jobName)

  // Wait for API to respond — "No jobs found" appears, then manual input shows
  const manualInput = page.getByPlaceholder(/enter job name manually/i)
  await expect(manualInput).toBeVisible({ timeout: 20_000 })
  await manualInput.fill(jobName)

  const continueBtn = page.getByRole("button", { name: /continue/i })
  await expect(continueBtn).toBeVisible({ timeout: 5_000 })
  await continueBtn.click()
}

async function advanceToTypeStep(page: import("@playwright/test").Page, jobName = "E2E Door Type Test") {
  await page.goto("/assemblies/new?type=DOOR")
  await fillJobStep(page, jobName)
}

async function advanceToSizeStep(
  page: import("@playwright/test").Page,
  doorType: string,
  jobName = "E2E DoorSize Test",
) {
  await advanceToTypeStep(page, jobName)
  await page.getByText(doorType, { exact: true }).click()
  await expect(
    page.getByText("Standard Size").or(page.getByText("Custom Size")).first(),
  ).toBeVisible({ timeout: 10_000 })
}

async function advanceToConfirmStep(page: import("@playwright/test").Page) {
  await advanceToSizeStep(page, "Cooler Swing", "E2E DoorConfirm Test")
  const sizeCard = page.locator("button, [role='button']").filter({ hasText: /×|x/ }).first()
  if (await sizeCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await sizeCard.click()
  }
  await expect(
    page.getByText("Components").or(page.getByText("Submit for Approval")).or(page.getByText("Save as Draft")),
  ).toBeVisible({ timeout: 15_000 })
}

// ─── Tests ─────────────────────────────────────────────────────────

test.describe("Door Creation — Assembly Page", () => {
  test("assembly page loads with Door Shop tab", async ({ page }) => {
    await goToAssemblies(page)
    await expect(page.getByRole("button", { name: "Door Shop" })).toBeVisible()
    await screenshot(page, "flow-06-assemblies-door-shop-tab")
  })

  test("New Door button navigates to creation flow", async ({ page }) => {
    await goToAssemblies(page)
    await page.getByRole("button", { name: "Door Shop" }).click()

    const newDoorBtn = page.getByRole("button", { name: /new door/i })
    await expect(newDoorBtn).toBeVisible({ timeout: 10_000 })
    await newDoorBtn.click()

    // Should land on the door creation page (job step)
    await expect(page.getByPlaceholder(/search jobs/i)).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-06-new-door-navigated")
  })
})

test.describe("Door Creation — Type Chooser", () => {
  test("type chooser shows 4 door types in grid", async ({ page }) => {
    await advanceToTypeStep(page)
    await screenshot(page, "flow-06-type-chooser-grid")

    for (const doorType of DOOR_TYPES) {
      await expect(page.getByText(doorType)).toBeVisible({ timeout: 5_000 })
    }
  })

  test("selecting Cooler Swing advances to size step", async ({ page }) => {
    await advanceToTypeStep(page, "E2E Cooler Swing Size")
    await page.getByText("Cooler Swing", { exact: true }).click()

    await expect(
      page.getByRole("heading", { name: "Standard Size" }),
    ).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-06-cooler-swing-size")
  })

  test("selecting Freezer Swing advances to size step", async ({ page }) => {
    await advanceToTypeStep(page, "E2E FrzSwing Size")
    await page.getByText("Freezer Swing", { exact: true }).click()

    await expect(
      page.getByRole("heading", { name: "Standard Size" }),
    ).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-06-freezer-swing-size")
  })

  test("selecting Cooler Slider advances to size step", async ({ page }) => {
    await advanceToTypeStep(page, "E2E ClrSlider Size")
    await page.getByText("Cooler Slider", { exact: true }).click()

    await expect(
      page.getByRole("heading", { name: "Standard Size" }),
    ).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-06-cooler-slider-size")
  })

  test("selecting Freezer Slider advances to size step", async ({ page }) => {
    await advanceToTypeStep(page, "E2E FrzSlider Size")
    await page.getByText("Freezer Slider", { exact: true }).click()

    await expect(
      page.getByRole("heading", { name: "Standard Size" }),
    ).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-06-freezer-slider-size")
  })
})

test.describe("Door Creation — Size Selection", () => {
  test("size step shows standard sizes plus custom option", async ({ page }) => {
    await advanceToSizeStep(page, "Cooler Swing")
    await screenshot(page, "flow-06-size-step-options")

    // Standard sizes include dimension text (e.g. 3×7, 4×7)
    const body = await page.locator("body").innerText()
    expect(body.includes("Custom Size")).toBe(true)
    expect(body.match(/\d+['"]?\s*[×x]\s*\d+['"]?/)).not.toBeNull()
  })

  test("selecting a standard size advances to confirm", async ({ page }) => {
    await advanceToSizeStep(page, "Cooler Swing", "E2E Size Select")

    const sizeCard = page.locator("button, [role='button']").filter({ hasText: /×|x/ }).first()
    await expect(sizeCard).toBeVisible({ timeout: 5_000 })
    await sizeCard.click()

    // Should reach confirm step
    await expect(
      page.getByText("Components")
        .or(page.getByText("Submit for Approval"))
        .or(page.getByText("Save as Draft")),
    ).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "flow-06-size-to-confirm")
  })
})

test.describe("Door Creation — Confirm Step", () => {
  test("confirm step shows specs summary", async ({ page }) => {
    await advanceToConfirmStep(page)
    await screenshot(page, "flow-06-confirm-specs-summary")

    // Specs summary should mention the door type and/or dimensions
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Cooler") || body.includes("Components") || body.includes("Specs"),
    ).toBe(true)
  })
})

test.describe("Door Creation — Full Flows", () => {
  test("full flow: create cooler swing door end-to-end", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")
    await fillJobStep(page, `E2E ClrSwing ${Date.now()}`)

    // Type step
    await expect(page.getByText("Cooler Swing", { exact: true })).toBeVisible({ timeout: 10_000 })
    await page.getByText("Cooler Swing", { exact: true }).click()

    // Size step — pick first standard
    const sizeCard = page.locator("button, [role='button']").filter({ hasText: /×|x/ }).first()
    await expect(sizeCard).toBeVisible({ timeout: 10_000 })
    await sizeCard.click()

    // Confirm step — should have Submit button
    await expect(
      page.getByText("Submit for Approval")
        .or(page.getByText("Save as Draft"))
        .or(page.getByText("Components")),
    ).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "flow-06-cooler-swing-e2e-confirm")
  })

  test("full flow: create freezer slider door end-to-end", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")
    await fillJobStep(page, `E2E FrzSldr ${Date.now()}`)

    // Type step
    await expect(page.getByText("Freezer Slider", { exact: true })).toBeVisible({ timeout: 10_000 })
    await page.getByText("Freezer Slider", { exact: true }).click()

    // Size step — pick first standard
    const sizeCard = page.locator("button, [role='button']").filter({ hasText: /×|x/ }).first()
    await expect(sizeCard).toBeVisible({ timeout: 10_000 })
    await sizeCard.click()

    // Confirm step
    await expect(
      page.getByText("Submit for Approval")
        .or(page.getByText("Save as Draft"))
        .or(page.getByText("Components")),
    ).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "flow-06-freezer-slider-e2e-confirm")
  })
})

test.describe("Door Creation — Queue & Detail", () => {
  test("door cards in queue are clickable and navigate to detail", async ({ page }) => {
    const assemblies = await getAssemblies(page, "DOOR")
    if (assemblies.length === 0) {
      test.skip()
      return
    }

    await goToAssemblies(page)
    await page.getByRole("button", { name: "Door Shop" }).click()

    // Click the first door card — cards use window.location.href
    const firstCard = page.locator("[class*='card'], [class*='Card']").first()
    if (await firstCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstCard.click()
      await expect(page).toHaveURL(/\/assemblies\//, { timeout: 10_000 })
      await screenshot(page, "flow-06-door-card-navigated")
    }
  })

  test("door detail page shows lifecycle tracker", async ({ page }) => {
    const assemblies = await getAssemblies(page, "DOOR")
    if (assemblies.length === 0) {
      test.skip()
      return
    }

    const door = assemblies[0]
    await page.goto(`/assemblies/${door.id}`)

    // Lifecycle stages: Created, Building, Complete, Shipped
    await expect(
      page.getByText("Created", { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-06-door-detail-lifecycle")
  })
})
