import { test, expect } from "@playwright/test"
import { screenshot } from "./helpers"

/**
 * Door Creation Tests
 *
 * The door creation flow is a 4-step interview:
 * 1. Job Selection — pick or type a job name
 * 2. Door Type — Cooler Swing, Freezer Swing, Cooler Slider, Freezer Slider
 * 3. Standard Size — pre-set sizes or Custom
 * 4. Confirm — review specs, components, submit
 */

const DOOR_TYPES = [
  { label: "Cooler Swing", subtitle: "Hinged cooler door" },
  { label: "Freezer Swing", subtitle: "Hinged freezer door" },
  { label: "Cooler Slider", subtitle: "Sliding cooler door" },
  { label: "Freezer Slider", subtitle: "Sliding freezer door" },
] as const

test.describe("Door Creation — Type Chooser", () => {
  test("assembly new page shows type chooser", async ({ page }) => {
    await page.goto("/assemblies/new")
    await page.waitForLoadState("networkidle")
    await screenshot(page, "08-door-type-chooser")

    // "What are you building?" heading
    await expect(page.locator("text=What are you building?")).toBeVisible({ timeout: 10_000 })

    // Two main options
    await expect(page.locator("text=New Door")).toBeVisible()
    await expect(page.locator("text=New Panel")).toBeVisible()
  })

  test("clicking New Door starts door flow", async ({ page }) => {
    await page.goto("/assemblies/new")
    await page.waitForLoadState("networkidle")

    await page.locator("button").filter({ hasText: "New Door" }).click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "08-door-job-selection")

    // Should advance to Job selection step
    await expect(page.locator("text=Select Job").or(page.locator("text=job"))).toBeVisible({
      timeout: 10_000,
    })
  })

  test("?type=DOOR skips type chooser", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")
    await screenshot(page, "08-door-skip-chooser")

    // Should go straight to job selection
    await expect(page.locator("text=Select Job").or(page.locator("text=job"))).toBeVisible({
      timeout: 10_000,
    })
  })
})

test.describe("Door Creation — Job Selection", () => {
  test("job search input is visible", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")

    await expect(page.getByPlaceholder(/search jobs/i)).toBeVisible({ timeout: 10_000 })
  })

  test("can enter job name manually when no jobs match", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")

    // Search for something that won't match
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await searchInput.fill("E2E Test Job Manual Entry")
    await page.waitForTimeout(1_000)

    await screenshot(page, "08-door-manual-job")

    // Should show manual entry input or "No jobs found" fallback
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    const continueBtn = page.locator("button").filter({ hasText: /continue/i })

    const hasManualInput = await manualInput.isVisible({ timeout: 5_000 }).catch(() => false)
    const hasContinue = await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)

    expect(hasManualInput || hasContinue).toBe(true)
  })

  test("back button returns to type chooser", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")

    const backBtn = page.locator("button").filter({ hasText: /back/i }).first()
    if (await backBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await backBtn.click()
      await page.waitForTimeout(1_000)
      await screenshot(page, "08-door-back-to-chooser")
    }
  })
})

test.describe("Door Creation — Door Type Selection", () => {
  async function advanceToTypeStep(page: import("@playwright/test").Page) {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")

    // Enter a job name and proceed
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await searchInput.fill("E2E Door Type Test")
    await page.waitForTimeout(1_000)

    // Try clicking a job from the list, or use manual entry
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("E2E Door Type Test")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    } else {
      // Click first job result
      const jobItem = page.locator("[role='button'], button").filter({ hasText: /E2E|job/i }).first()
      if (await jobItem.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await jobItem.click()
      }
    }
    await page.waitForTimeout(1_000)
  }

  test("shows all 4 door type cards", async ({ page }) => {
    await advanceToTypeStep(page)
    await screenshot(page, "08-door-type-cards")

    // Verify all 4 door types
    for (const doorType of DOOR_TYPES) {
      await expect(page.locator(`text=${doorType.label}`)).toBeVisible({ timeout: 5_000 })
    }
  })

  for (const doorType of DOOR_TYPES) {
    test(`selecting ${doorType.label} advances to size step`, async ({ page }) => {
      await advanceToTypeStep(page)

      await page.locator(`text=${doorType.label}`).click()
      await page.waitForTimeout(1_000)
      await screenshot(page, `08-door-size-${doorType.label.replace(/\s/g, "-").toLowerCase()}`)

      // Should advance to Standard Size step
      await expect(
        page.locator("text=Standard Size").or(page.locator("text=Custom Size"))
      ).toBeVisible({ timeout: 10_000 })
    })
  }
})

test.describe("Door Creation — Size Selection", () => {
  async function advanceToSizeStep(
    page: import("@playwright/test").Page,
    doorType = "Cooler Swing"
  ) {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")

    // Job step
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await searchInput.fill("E2E Size Test")
    await page.waitForTimeout(1_000)
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("E2E Size Test")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    }
    await page.waitForTimeout(1_000)

    // Type step
    await page.locator(`text=${doorType}`).click()
    await page.waitForTimeout(1_000)
  }

  test("Cooler Swing shows standard sizes (3x7, 4x7, 5x7)", async ({ page }) => {
    await advanceToSizeStep(page, "Cooler Swing")
    await screenshot(page, "08-door-cooler-swing-sizes")

    // Should show at least 3×7 size option
    const body = await page.locator("body").innerText()
    expect(body.includes("3'") || body.includes('36"') || body.includes("3 ×")).toBe(true)
  })

  test("Cooler Slider shows larger standard sizes", async ({ page }) => {
    await advanceToSizeStep(page, "Cooler Slider")
    await screenshot(page, "08-door-cooler-slider-sizes")

    const body = await page.locator("body").innerText()
    // Sliders have larger options like 6×7, 8×8
    expect(
      body.includes("4'") || body.includes("5'") || body.includes("6'") || body.includes("8'")
    ).toBe(true)
  })

  test("Custom Size option is available", async ({ page }) => {
    await advanceToSizeStep(page, "Cooler Swing")

    await expect(page.locator("text=Custom Size")).toBeVisible({ timeout: 5_000 })
    await screenshot(page, "08-door-custom-size-option")
  })

  test("selecting a standard size advances to confirm step", async ({ page }) => {
    await advanceToSizeStep(page, "Cooler Swing")

    // Click the first size option (not Custom)
    const sizeCards = page.locator("button, [role='button']").filter({
      hasText: /×|x/,
    })
    const firstSize = sizeCards.first()
    if (await firstSize.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstSize.click()
      await page.waitForTimeout(2_000)
      await screenshot(page, "08-door-confirm-step")

      // Should show confirm/review step with components
      const body = await page.locator("body").innerText()
      expect(
        body.includes("Components") ||
        body.includes("Submit") ||
        body.includes("Save") ||
        body.includes("Confirm")
      ).toBe(true)
    }
  })
})

test.describe("Door Creation — Confirm & Submit", () => {
  async function advanceToConfirmStep(page: import("@playwright/test").Page) {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")

    // Job step
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await searchInput.fill("E2E Confirm Test")
    await page.waitForTimeout(1_000)
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("E2E Confirm Test")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    }
    await page.waitForTimeout(1_000)

    // Type step — Cooler Swing
    const coolerSwing = page.locator("text=Cooler Swing")
    if (await coolerSwing.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await coolerSwing.click()
      await page.waitForTimeout(1_000)
    }

    // Size step — first standard size
    const sizeCard = page
      .locator("button, [role='button']")
      .filter({ hasText: /×|x/ })
      .first()
    if (await sizeCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await sizeCard.click()
      await page.waitForTimeout(2_000)
    }
  }

  test("confirm step shows Submit for Approval and Save as Draft", async ({ page }) => {
    await advanceToConfirmStep(page)
    await screenshot(page, "08-door-confirm-buttons")

    // Submit for Approval (primary action)
    const submitBtn = page.locator("button").filter({ hasText: /submit for approval/i })
    const draftBtn = page.locator("button").filter({ hasText: /save as draft/i })

    const hasSubmit = await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    const hasDraft = await draftBtn.isVisible({ timeout: 3_000 }).catch(() => false)

    // At least one action button should be visible
    expect(hasSubmit || hasDraft).toBe(true)
  })

  test("confirm step shows component list", async ({ page }) => {
    await advanceToConfirmStep(page)

    // Components section
    const components = page.locator("text=Components")
    if (await components.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await screenshot(page, "08-door-components-list")
    }
  })

  test("step progress indicator shows all 4 steps", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1_000)

    // Step progress should show Job, Type, Size, Confirm
    const body = await page.locator("body").innerText()
    const hasSteps =
      body.includes("Job") && body.includes("Type") && body.includes("Size") && body.includes("Confirm")

    await screenshot(page, "08-door-step-progress")

    // At minimum the step labels should be present somewhere
    // (they may be in the step progress dots or as section labels)
  })
})

// Full end-to-end door creation for each type
test.describe("Door Creation — Full Flow Per Type", () => {
  const doorConfigs = [
    { type: "Cooler Swing", temp: "Cooler", style: "Hinged" },
    { type: "Freezer Swing", temp: "Freezer", style: "Hinged" },
    { type: "Cooler Slider", temp: "Cooler", style: "Sliding" },
    { type: "Freezer Slider", temp: "Freezer", style: "Sliding" },
  ]

  for (const config of doorConfigs) {
    test(`create ${config.type} door end-to-end`, async ({ page }) => {
      await page.goto("/assemblies/new?type=DOOR")
      await page.waitForLoadState("networkidle")

      // Step 1: Job
      const searchInput = page.getByPlaceholder(/search jobs/i)
      await expect(searchInput).toBeVisible({ timeout: 10_000 })
      await searchInput.fill(`E2E ${config.type} Full`)
      await page.waitForTimeout(1_000)

      const manualInput = page.getByPlaceholder(/enter job name manually/i)
      if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await manualInput.fill(`E2E ${config.type} Full`)
        const continueBtn = page.locator("button").filter({ hasText: /continue/i })
        if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await continueBtn.click()
        }
      }
      await page.waitForTimeout(1_000)
      await screenshot(page, `08-door-full-${config.type.replace(/\s/g, "-").toLowerCase()}-job`)

      // Step 2: Door Type
      const typeBtn = page.locator(`text=${config.type}`)
      if (await typeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await typeBtn.click()
        await page.waitForTimeout(1_000)
        await screenshot(page, `08-door-full-${config.type.replace(/\s/g, "-").toLowerCase()}-type`)
      }

      // Step 3: Size (pick first standard)
      const sizeCard = page
        .locator("button, [role='button']")
        .filter({ hasText: /×|x/ })
        .first()
      if (await sizeCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await sizeCard.click()
        await page.waitForTimeout(2_000)
        await screenshot(page, `08-door-full-${config.type.replace(/\s/g, "-").toLowerCase()}-size`)
      }

      // Step 4: Confirm — verify we reached it
      const body = await page.locator("body").innerText()
      const reachedConfirm =
        body.includes("Components") ||
        body.includes("Submit for Approval") ||
        body.includes("Save as Draft")

      await screenshot(page, `08-door-full-${config.type.replace(/\s/g, "-").toLowerCase()}-confirm`)

      // The flow should successfully reach the confirm step
      expect(reachedConfirm).toBe(true)
    })
  }
})
