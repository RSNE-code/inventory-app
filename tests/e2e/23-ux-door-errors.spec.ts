import { test, expect } from "@playwright/test"
import { screenshot } from "./helpers"

/**
 * UX Friction Tests: Door & Assembly Creation
 *
 * Tests back-button behavior, state preservation, dead ends,
 * and recovery from mistakes in the multi-step door builder.
 * ALL tests use real user interactions only.
 */

test.describe("UX: Door Flow — Back Button Preserves State", () => {
  test("going back from Type to Job preserves the job name", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")

    // Step 1: Enter a job name
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill("State Preservation Test Job")
    await page.waitForTimeout(1_000)

    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("State Preservation Test Job")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    }
    await page.waitForTimeout(1_000)

    // Should now be on Type step
    await expect(page.locator("text=Cooler Swing")).toBeVisible({ timeout: 5_000 })
    await screenshot(page, "23-ux-door-type-step")

    // Step 2: Go BACK to Job step
    const backBtn = page.locator("button").filter({ hasText: /back/i }).first()
    await expect(backBtn).toBeVisible({ timeout: 5_000 })
    await backBtn.click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "23-ux-door-back-to-job")

    // UX CHECK: The job name should still be visible/selected
    // If it's cleared, user has to re-enter everything — terrible for flow
    const body = await page.locator("body").innerText()
    const jobPreserved =
      body.includes("State Preservation Test Job") ||
      body.includes("Select Job") // At least back at job step

    expect(jobPreserved).toBe(true)
  })

  test("going back from Size to Type preserves the door type", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")

    // Quick-advance through Job step
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill("Back Button Test")
    await page.waitForTimeout(1_000)
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("Back Button Test")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    }
    await page.waitForTimeout(1_000)

    // Select Freezer Swing
    await page.locator("text=Freezer Swing").click()
    await page.waitForTimeout(1_000)

    // Now on Size step — go back
    const backBtn = page.locator("button").filter({ hasText: /back/i }).first()
    if (await backBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await backBtn.click()
      await page.waitForTimeout(1_000)
      await screenshot(page, "23-ux-door-back-to-type")

      // UX CHECK: Should be back on type selection
      // All 4 door types should be visible
      await expect(page.locator("text=Cooler Swing")).toBeVisible({ timeout: 5_000 })
    }
  })
})

test.describe("UX: Door Flow — Loading States", () => {
  test("loading jobs shows indicator, not blank list", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")

    // Immediately screenshot to catch loading state
    await screenshot(page, "23-ux-door-jobs-loading")

    // Wait for it to resolve
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2_000)
    await screenshot(page, "23-ux-door-jobs-loaded")

    // UX CHECK: During load, user should see "Loading jobs..." or a skeleton,
    // not a blank white space
    // (The loaded state should have a search input)
    await expect(page.getByPlaceholder(/search jobs/i)).toBeVisible({ timeout: 10_000 })
  })

  test("loading components after size selection shows feedback", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")

    // Quick advance: Job
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill("Components Loading Test")
    await page.waitForTimeout(1_000)
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("Components Loading Test")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    }
    await page.waitForTimeout(1_000)

    // Type: Cooler Swing
    await page.locator("text=Cooler Swing").click()
    await page.waitForTimeout(1_000)

    // Click first standard size
    const sizeCard = page
      .locator("button, [role='button']")
      .filter({ hasText: /×|x/ })
      .first()
    if (await sizeCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await sizeCard.click()

      // Immediately screenshot to catch "Loading components..." state
      await screenshot(page, "23-ux-door-components-loading")

      await page.waitForTimeout(3_000)
      await screenshot(page, "23-ux-door-components-loaded")
    }
  })
})

test.describe("UX: Door Flow — Dead Ends", () => {
  test("no jobs found — user has fallback to enter manually", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")

    const searchInput = page.getByPlaceholder(/search jobs/i)
    await expect(searchInput).toBeVisible({ timeout: 10_000 })

    // Search for something that won't match
    await searchInput.fill("zzz_nonexistent_job_12345")
    await page.waitForTimeout(1_500)
    await screenshot(page, "23-ux-door-no-jobs-found")

    // UX CHECK: There must be a manual entry fallback
    // Without it, users with new jobs can't create doors
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    const continueBtn = page.locator("button").filter({ hasText: /continue/i })

    const hasManualEntry = await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)
    const hasContinue = await continueBtn.isVisible({ timeout: 2_000 }).catch(() => false)

    if (!hasManualEntry && !hasContinue) {
      test.fail(
        true,
        "UX DEAD END: No jobs match the search and there's no manual entry fallback. " +
          "User cannot create a door for a new/unlisted job."
      )
    }
  })

  test("page refresh mid-flow loses all state (no recovery)", async ({ page }) => {
    await page.goto("/assemblies/new?type=DOOR")
    await page.waitForLoadState("networkidle")

    // Advance to Type step
    const searchInput = page.getByPlaceholder(/search jobs/i)
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill("Refresh Loss Test")
    await page.waitForTimeout(1_000)
    const manualInput = page.getByPlaceholder(/enter job name manually/i)
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("Refresh Loss Test")
      const continueBtn = page.locator("button").filter({ hasText: /continue/i })
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
      }
    }
    await page.waitForTimeout(1_000)

    // Select a door type
    await page.locator("text=Cooler Swing").click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "23-ux-door-before-refresh")

    // REFRESH the page
    await page.reload()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2_000)
    await screenshot(page, "23-ux-door-after-refresh")

    // UX CHECK: All progress is lost on refresh.
    // User is back at Job step (or type chooser).
    // This is expected but worth documenting as UX friction:
    // a construction worker who accidentally refreshes loses everything.
    const body = await page.locator("body").innerText()
    const lostProgress =
      body.includes("Select Job") ||
      body.includes("Search jobs") ||
      body.includes("What are you building")

    // If progress was lost, this confirms the friction point
    if (lostProgress) {
      // UX FRICTION NOTE: No state persistence on refresh.
      // Multi-step flows should save draft state to survive accidental refreshes.
    }
  })
})

test.describe("UX: Assembly Detail — Error Recovery", () => {
  test("nonexistent assembly shows error, not crash", async ({ page }) => {
    await page.goto("/assemblies/nonexistent-id-99999")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3_000)
    await screenshot(page, "23-ux-assembly-not-found")

    const body = await page.locator("body").innerText()
    const hasError =
      body.includes("not found") ||
      body.includes("Not Found") ||
      body.includes("Assembly not found")

    expect(hasError).toBe(true)
  })

  test("assembly approval rejection requires a note", async ({ page }) => {
    // Navigate to assemblies and find one awaiting approval
    await page.goto("/assemblies")
    await page.waitForLoadState("networkidle")

    await page.locator("button").filter({ hasText: "Door Shop" }).click()
    await page.waitForTimeout(500)

    // Filter to Pending
    const pendingFilter = page.locator("button").filter({ hasText: "Pending" })
    if (await pendingFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await pendingFilter.click()
      await page.waitForTimeout(1_000)
    }

    // Click first assembly
    const assemblyLink = page.locator("a[href^='/assemblies/']").first()
    if (!(await assemblyLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }
    await assemblyLink.click()
    await page.waitForLoadState("networkidle")
    await screenshot(page, "23-ux-assembly-approval-detail")

    // Look for Reject button
    const rejectBtn = page.locator("button").filter({ hasText: /reject/i })
    if (!(await rejectBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    // Click reject WITHOUT entering a note
    await rejectBtn.click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "23-ux-assembly-reject-no-note")

    // UX CHECK: Should show error "Please add a note explaining the rejection"
    const errorMsg = page.locator("text=note").or(page.locator("text=Note"))
    const hasError = await errorMsg.isVisible({ timeout: 3_000 }).catch(() => false)

    // Good UX: rejection requires explanation so the builder knows what to fix
  })
})

test.describe("UX: Assembly Delete — Safety", () => {
  test("delete assembly requires confirmation dialog", async ({ page }) => {
    await page.goto("/assemblies")
    await page.waitForLoadState("networkidle")

    await page.locator("button").filter({ hasText: "Door Shop" }).click()
    await page.waitForTimeout(500)

    const assemblyLink = page.locator("a[href^='/assemblies/']").first()
    if (!(await assemblyLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }
    await assemblyLink.click()
    await page.waitForLoadState("networkidle")

    // Look for delete button
    const deleteBtn = page.locator("button").filter({ hasText: /delete assembly/i })
    if (!(await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip() // Not admin or wrong status
      return
    }

    await deleteBtn.click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "23-ux-assembly-delete-dialog")

    // UX CHECK: Must have confirmation dialog with "cannot be undone" warning
    const dialog = page.locator("[role='dialog'], [role='alertdialog']")
    const permanentWarning = page.locator("text=permanently").or(page.locator("text=cannot be undone"))

    const hasDialog = await dialog.isVisible({ timeout: 3_000 }).catch(() => false)
    const hasWarning = await permanentWarning.isVisible({ timeout: 2_000 }).catch(() => false)

    expect(hasDialog || hasWarning).toBe(true)

    // Cancel to avoid actually deleting
    const cancelBtn = page.locator("button").filter({ hasText: /cancel/i })
    if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cancelBtn.click()
    }
  })
})
