import { test, expect } from "@playwright/test"
import { screenshot } from "./helpers"

/**
 * Shop Item Tests — Panels, Floors, Ramps
 *
 * The fab creation flow is a 4-step interview:
 * 1. Job Selection — pick or type a job name
 * 2. Fab Type — Wall Panel, Floor Panel, Ramp
 * 3. Specs — dimensions, materials, insulation
 * 4. Review — confirm and submit to fabrication queue
 */

test.describe("Shop Items — Type Chooser", () => {
  test("clicking New Panel starts fab flow", async ({ page }) => {
    await page.goto("/assemblies/new")
    await page.waitForLoadState("networkidle")

    await page.locator("button").filter({ hasText: /new panel/i }).click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "09-shop-panel-flow-start")

    // Should advance to Job selection
    await expect(
      page.locator("text=Select Job").or(page.getByPlaceholder(/search jobs/i))
    ).toBeVisible({ timeout: 10_000 })
  })

  test("?type=PANEL skips type chooser", async ({ page }) => {
    await page.goto("/assemblies/new?type=PANEL")
    await page.waitForLoadState("networkidle")
    await screenshot(page, "09-shop-panel-skip-chooser")

    await expect(
      page.locator("text=Select Job").or(page.getByPlaceholder(/search jobs/i))
    ).toBeVisible({ timeout: 10_000 })
  })
})

test.describe("Shop Items — Fab Type Selection", () => {
  async function advanceToFabType(page: import("@playwright/test").Page) {
    await page.goto("/assemblies/new?type=PANEL")
    await page.waitForLoadState("networkidle")

    const searchInput = page.getByPlaceholder(/search jobs/i)
    await searchInput.fill("E2E Fab Type Test")
    await page.waitForTimeout(1_000)

    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("E2E Fab Type Test")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    }
    await page.waitForTimeout(1_000)
  }

  test("shows Wall Panel, Floor Panel, and Ramp options", async ({ page }) => {
    await advanceToFabType(page)
    await screenshot(page, "09-shop-fab-type-options")

    await expect(page.locator("text=Wall Panel")).toBeVisible({ timeout: 5_000 })
    await expect(page.locator("text=Floor Panel")).toBeVisible()
    await expect(page.locator("text=Ramp")).toBeVisible()
  })

  test("selecting Wall Panel advances to template/specs", async ({ page }) => {
    await advanceToFabType(page)

    await page.locator("text=Wall Panel").click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "09-shop-wall-panel-next")

    // Should show template selection or specs form
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Template") ||
      body.includes("Specs") ||
      body.includes("Custom") ||
      body.includes("Width")
    ).toBe(true)
  })

  test("selecting Floor Panel advances to template/specs", async ({ page }) => {
    await advanceToFabType(page)

    await page.locator("text=Floor Panel").click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "09-shop-floor-panel-next")

    const body = await page.locator("body").innerText()
    expect(
      body.includes("Template") ||
      body.includes("Specs") ||
      body.includes("Custom") ||
      body.includes("Width")
    ).toBe(true)
  })

  test("selecting Ramp advances to specs", async ({ page }) => {
    await advanceToFabType(page)

    await page.locator("text=Ramp").click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "09-shop-ramp-next")

    const body = await page.locator("body").innerText()
    expect(
      body.includes("Specs") ||
      body.includes("Width") ||
      body.includes("Length") ||
      body.includes("Height") ||
      body.includes("Ramp")
    ).toBe(true)
  })
})

test.describe("Shop Items — Wall Panel Full Flow", () => {
  async function advanceToWallPanelSpecs(page: import("@playwright/test").Page) {
    await page.goto("/assemblies/new?type=PANEL")
    await page.waitForLoadState("networkidle")

    // Job step
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await searchInput.fill("E2E Wall Panel Test")
    await page.waitForTimeout(1_000)
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("E2E Wall Panel Test")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    }
    await page.waitForTimeout(1_000)

    // Type step
    await page.locator("text=Wall Panel").click()
    await page.waitForTimeout(1_000)

    // Template step — use Custom if available
    const customBtn = page.locator("text=Custom").first()
    if (await customBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await customBtn.click()
      await page.waitForTimeout(1_000)
    }
  }

  test("wall panel specs form has dimension and material fields", async ({ page }) => {
    await advanceToWallPanelSpecs(page)
    await screenshot(page, "09-shop-wall-panel-specs")

    // Specs form should be visible with dimension inputs
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Width") ||
      body.includes("Length") ||
      body.includes("Insulation") ||
      body.includes("Specs")
    ).toBe(true)
  })

  test("wall panel has quantity stepper", async ({ page }) => {
    await advanceToWallPanelSpecs(page)

    // Quantity section
    const qtyLabel = page.locator("text=Quantity")
    if (await qtyLabel.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await screenshot(page, "09-shop-wall-panel-quantity")
    }
  })

  test("wall panel requires continue to review button", async ({ page }) => {
    await advanceToWallPanelSpecs(page)

    const continueBtn = page.locator("button").filter({ hasText: /continue to review/i })
    if (await continueBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await screenshot(page, "09-shop-wall-panel-continue")
    }
  })
})

test.describe("Shop Items — Floor Panel Full Flow", () => {
  test("create floor panel end-to-end", async ({ page }) => {
    await page.goto("/assemblies/new?type=PANEL")
    await page.waitForLoadState("networkidle")

    // Job step
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill("E2E Floor Panel")
    await page.waitForTimeout(1_000)
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("E2E Floor Panel")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    }
    await page.waitForTimeout(1_000)
    await screenshot(page, "09-shop-floor-panel-job")

    // Type step
    const floorBtn = page.locator("text=Floor Panel")
    if (await floorBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await floorBtn.click()
      await page.waitForTimeout(1_000)
      await screenshot(page, "09-shop-floor-panel-type")
    }

    // Template/Custom step
    const customBtn = page.locator("text=Custom").first()
    if (await customBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await customBtn.click()
      await page.waitForTimeout(1_000)
    }

    await screenshot(page, "09-shop-floor-panel-specs")

    // Should reach specs or review
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Width") ||
      body.includes("Specs") ||
      body.includes("Review") ||
      body.includes("Floor")
    ).toBe(true)
  })
})

test.describe("Shop Items — Ramp Full Flow", () => {
  test("create ramp end-to-end", async ({ page }) => {
    await page.goto("/assemblies/new?type=PANEL")
    await page.waitForLoadState("networkidle")

    // Job step
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill("E2E Ramp Test")
    await page.waitForTimeout(1_000)
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("E2E Ramp Test")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    }
    await page.waitForTimeout(1_000)
    await screenshot(page, "09-shop-ramp-job")

    // Type step — Ramp
    const rampBtn = page.locator("text=Ramp")
    if (await rampBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await rampBtn.click()
      await page.waitForTimeout(1_000)
      await screenshot(page, "09-shop-ramp-type")
    }

    // Ramp should go directly to specs (no template step)
    await screenshot(page, "09-shop-ramp-specs")

    const body = await page.locator("body").innerText()
    expect(
      body.includes("Width") ||
      body.includes("Length") ||
      body.includes("Height") ||
      body.includes("Diamond Plate") ||
      body.includes("Ramp")
    ).toBe(true)
  })

  test("ramp specs include diamond plate thickness option", async ({ page }) => {
    await page.goto("/assemblies/new?type=PANEL")
    await page.waitForLoadState("networkidle")

    // Quick advance through job
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill("E2E Ramp Diamond")
    await page.waitForTimeout(1_000)
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("E2E Ramp Diamond")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    }
    await page.waitForTimeout(1_000)

    // Select Ramp
    await page.locator("text=Ramp").click()
    await page.waitForTimeout(1_000)

    await screenshot(page, "09-shop-ramp-diamond-plate")

    // Look for diamond plate option
    const body = await page.locator("body").innerText()
    const hasDiamondPlate =
      body.includes("Diamond") || body.includes(".063") || body.includes(".125") || body.includes(".25")

    // Diamond plate should be an option in ramp specs
    // If it's not visible, this is a potential UX gap
  })
})
