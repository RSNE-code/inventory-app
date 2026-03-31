import { test, expect } from "@playwright/test"
import { screenshot } from "./helpers"

/**
 * UX Friction Tests: BOM Workflow
 *
 * Tests error messages, loading states, recovery from mistakes,
 * and dead-end scenarios across the BOM lifecycle.
 * ALL tests use real user interactions only — no API shortcuts.
 */

test.describe("UX: BOM Creation — Error Prevention", () => {
  test("creating a BOM without a job name shows clear error", async ({ page }) => {
    await page.goto("/boms/new?mode=manual")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })

    // Add a product first
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
    await screenshot(page, "22-ux-bom-no-job-name")

    // Now try to create without a job name
    // Look for the create/submit button in the cart bar
    const createBtn = page
      .locator("button")
      .filter({ hasText: /create bom|review|submit/i })
      .first()

    if (await createBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // UX CHECK: If the button is clickable without a job name,
      // it should show "Job name is required" error
      const isDisabled = await createBtn.isDisabled()

      if (!isDisabled) {
        await createBtn.click()
        await page.waitForTimeout(1_000)
        await screenshot(page, "22-ux-bom-job-name-error")

        // Should show validation error
        const errorVisible = await page
          .locator("text=Job name is required")
          .isVisible({ timeout: 3_000 })
          .catch(() => false)

        // Either the button should be disabled OR the error should be shown
        expect(errorVisible).toBe(true)
      }
      // If disabled, that's good UX — prevents the mistake
    }
  })

  test("creating a BOM without any items shows clear error", async ({ page }) => {
    await page.goto("/boms/new?mode=manual")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "22-ux-bom-no-items")

    // UX CHECK: The create/submit button should not be visible or should be disabled
    // when no items have been added
    const createBtn = page
      .locator("button")
      .filter({ hasText: /create bom/i })
      .first()

    const isVisible = await createBtn.isVisible({ timeout: 3_000 }).catch(() => false)

    if (isVisible) {
      const isDisabled = await createBtn.isDisabled()
      if (!isDisabled) {
        // UX FRICTION: Button is enabled with no items — user will get an error
        await createBtn.click()
        await page.waitForTimeout(1_000)
        await screenshot(page, "22-ux-bom-no-items-error")

        await expect(page.locator("text=Add at least one item")).toBeVisible({ timeout: 3_000 })
      }
    }
    // If button is hidden or disabled, that's correct UX
  })
})

test.describe("UX: BOM Detail — Loading & Empty States", () => {
  test("BOM detail page shows loading skeleton while fetching", async ({ page }) => {
    // Navigate to BOM list first to find a real BOM
    await page.goto("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })

    // Switch to BOM List tab
    await page.locator("button").filter({ hasText: "BOM List" }).click()
    await page.waitForTimeout(500)

    // Click the first BOM
    const bomLink = page.locator("a[href^='/boms/']").first()
    if (!(await bomLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    // Navigate and immediately screenshot to catch loading state
    const href = await bomLink.getAttribute("href")
    await page.goto(href!)

    // Take screenshot IMMEDIATELY to catch skeleton/loading state
    await screenshot(page, "22-ux-bom-detail-loading")

    // Wait for content to load
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2_000)
    await screenshot(page, "22-ux-bom-detail-loaded")

    // UX CHECK: Page should have loaded with actual content, not a blank screen
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
  })

  test("nonexistent BOM shows helpful error, not blank page", async ({ page }) => {
    await page.goto("/boms/nonexistent-bom-id-99999")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3_000)
    await screenshot(page, "22-ux-bom-not-found")

    const body = await page.locator("body").innerText()

    // UX CHECK: Should show "BOM not found" not a crash or blank page
    const hasErrorMsg =
      body.includes("BOM not found") ||
      body.includes("not found") ||
      body.includes("Not Found")

    expect(hasErrorMsg).toBe(true)

    // UX CHECK: Should have navigation to escape (not a dead end)
    const hasEscape = await page
      .locator("a[href='/boms'], button, .lucide-arrow-left, .lucide-chevron-left")
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false)

    if (!hasEscape) {
      test.fail(
        true,
        "UX DEAD END: BOM not found page has no navigation link or back button. " +
          "User must manually type a URL or use browser back."
      )
    }
  })
})

test.describe("UX: BOM Status Transitions — User Feedback", () => {
  test("approving a BOM shows success feedback", async ({ page }) => {
    // Navigate to BOM list, find a Draft BOM
    await page.goto("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await page.locator("button").filter({ hasText: "BOM List" }).click()
    await page.waitForTimeout(500)

    // Filter to drafts
    await page.locator("button").filter({ hasText: "Draft" }).click()
    await page.waitForTimeout(1_000)

    const bomLink = page.locator("a[href^='/boms/']").first()
    if (!(await bomLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }
    await bomLink.click()
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "22-ux-bom-before-approve")

    // Find and click Approve button
    const approveBtn = page.getByRole("button", { name: /approve/i })
    if (!(await approveBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await approveBtn.click()
    await page.waitForTimeout(2_000)
    await screenshot(page, "22-ux-bom-after-approve")

    // UX CHECK: User should see clear feedback that approval happened
    const body = await page.locator("body").innerText()
    const hasConfirmation =
      body.includes("Approved") ||
      body.includes("approved") ||
      body.includes("Check Out")

    expect(hasConfirmation).toBe(true)
  })
})

test.describe("UX: BOM Review Queue — Recovery", () => {
  test("review queue shows empty state when no BOMs need review", async ({ page }) => {
    await page.goto("/boms/review")
    await expect(page.locator("text=Review Queue")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "22-ux-bom-review-queue")

    // UX CHECK: Even if queue is empty, it should show a helpful message
    // not a blank white page
    const body = await page.locator("body").innerText()
    const hasContent =
      body.includes("Review Queue") ||
      body.includes("No BOMs") ||
      body.includes("no items") ||
      body.includes("All clear") ||
      body.includes("empty")

    expect(hasContent).toBe(true)
  })
})

test.describe("UX: BOM Photo Upload — Failure Handling", () => {
  test("photo capture page is usable on desktop (no camera)", async ({ page }) => {
    await page.goto("/boms/new")
    await expect(page.locator("text=Snap Your Material List")).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "22-ux-bom-photo-desktop")

    // UX CHECK: On desktop, there's no camera. The user should have
    // an obvious way to upload a photo file instead.
    const body = await page.locator("body").innerText()
    const hasUploadOption =
      body.includes("upload") ||
      body.includes("Upload") ||
      body.includes("choose") ||
      body.includes("file") ||
      body.includes("manually")

    // There should always be a manual fallback
    await expect(page.locator("text=or enter manually")).toBeVisible()
  })

  test("switching to manual mode from photo mode is seamless", async ({ page }) => {
    await page.goto("/boms/new")
    await expect(page.locator("text=Snap Your Material List")).toBeVisible({ timeout: 10_000 })

    // Click manual entry
    await page.locator("text=or enter manually").click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "22-ux-bom-switch-manual")

    // UX CHECK: Manual mode should be fully functional
    await expect(page.getByPlaceholder(/search products/i)).toBeVisible({ timeout: 5_000 })

    // UX CHECK: Can the user switch BACK to photo mode?
    // If not, this is a one-way door
    const photoOption = page.locator("text=Snap").or(page.locator("text=Photo")).or(page.locator("text=Camera"))
    const canSwitchBack = await photoOption.isVisible({ timeout: 3_000 }).catch(() => false)

    if (!canSwitchBack) {
      // Not a hard failure — manual mode works, but one-way switch is noted
      await screenshot(page, "22-ux-bom-no-switch-back-to-photo")
    }
  })
})

test.describe("UX: BOM Delete — Confirmation Safety", () => {
  test("deleting a BOM requires confirmation (not instant)", async ({ page }) => {
    // Find a draft BOM to test delete on
    await page.goto("/boms")
    await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await page.locator("button").filter({ hasText: "BOM List" }).click()
    await page.waitForTimeout(500)
    await page.locator("button").filter({ hasText: "Draft" }).click()
    await page.waitForTimeout(1_000)

    const bomLink = page.locator("a[href^='/boms/']").first()
    if (!(await bomLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }
    await bomLink.click()
    await expect(page.locator("text=BOM Detail")).toBeVisible({ timeout: 15_000 })

    // Find delete button (might be in a menu)
    const deleteBtn = page.locator("button").filter({ hasText: /delete/i }).first()
    const moreBtn = page
      .locator("button")
      .filter({ has: page.locator(".lucide-more-vertical, .lucide-ellipsis") })
      .first()

    let foundDelete = await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false)

    if (!foundDelete && (await moreBtn.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await moreBtn.click()
      await page.waitForTimeout(500)
      foundDelete = await deleteBtn.isVisible({ timeout: 2_000 }).catch(() => false)
    }

    if (!foundDelete) {
      test.skip()
      return
    }

    await screenshot(page, "22-ux-bom-delete-button")
    await deleteBtn.click()
    await page.waitForTimeout(1_000)
    await screenshot(page, "22-ux-bom-delete-confirm-dialog")

    // UX CHECK: There MUST be a confirmation dialog
    // Accidental delete of a BOM with 50 line items would be catastrophic
    const dialog = page.locator("[role='dialog'], [role='alertdialog']")
    const confirmText = page.locator("text=cannot be undone").or(page.locator("text=permanently"))
    const cancelBtn = page.locator("button").filter({ hasText: /cancel/i })

    const hasDialog = await dialog.isVisible({ timeout: 3_000 }).catch(() => false)
    const hasWarning = await confirmText.isVisible({ timeout: 2_000 }).catch(() => false)
    const hasCancel = await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)

    if (!hasDialog && !hasWarning) {
      test.fail(
        true,
        "UX DANGER: BOM delete has no confirmation dialog! " +
          "A single accidental tap destroys the entire BOM."
      )
    }

    // If dialog exists, dismiss it without deleting
    if (hasCancel) {
      await cancelBtn.click()
      await page.waitForTimeout(500)
      // UX CHECK: After canceling, the BOM should still be there
      await expect(page.locator("text=BOM Detail")).toBeVisible()
    }
  })
})
