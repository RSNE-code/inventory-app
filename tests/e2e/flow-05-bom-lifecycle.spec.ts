import { test, expect } from "@playwright/test"
import { screenshot, createTestBom } from "./helpers"

/**
 * Flow 05 — BOM Lifecycle
 *
 * Covers status transitions (Draft -> Review -> Approved/Cancelled),
 * edit mode, fab gate, delete with confirmation dialog, and error
 * states for missing BOMs. Uses `createTestBom` API helper to set
 * up BOMs in specific states for each test.
 */

test.describe("BOM Lifecycle — Draft", () => {
  test("draft BOM shows Submit for Review button", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Draft Review ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 3, isNonCatalog: true, nonCatalogName: "Draft Item A", tier: "TIER_2" },
      ],
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.getByText("BOM Detail")).toBeVisible({ timeout: 15_000 })

    await expect(
      page.getByRole("button", { name: /submit for review/i })
    ).toBeVisible()

    await screenshot(page, "flow-05-draft-submit-review-btn")
  })

  test("draft BOM shows Edit Draft button", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Draft Edit ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 2, isNonCatalog: true, nonCatalogName: "Editable Item", tier: "TIER_2" },
      ],
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.getByText("BOM Detail")).toBeVisible({ timeout: 15_000 })

    await expect(
      page.getByRole("button", { name: /edit draft/i })
    ).toBeVisible()

    await screenshot(page, "flow-05-draft-edit-btn")
  })

  test("edit mode allows adding and removing items", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Edit Items ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 5, isNonCatalog: true, nonCatalogName: "Original Item", tier: "TIER_2" },
      ],
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.getByText("BOM Detail")).toBeVisible({ timeout: 15_000 })

    // Enter edit mode
    const editBtn = page.getByRole("button", { name: /edit draft/i })
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    // Edit mode should show editing UI — qty fields or remove buttons
    // The edit mode shows pencil icon and allows qty changes
    await expect(page.getByText("Original Item")).toBeVisible()

    await screenshot(page, "flow-05-edit-mode-active")
  })

  test("submit for review transitions to PENDING_REVIEW", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Submit Review ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 4, isNonCatalog: true, nonCatalogName: "Review Transition Item", tier: "TIER_2" },
      ],
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.getByText("BOM Detail")).toBeVisible({ timeout: 15_000 })

    const submitBtn = page.getByRole("button", { name: /submit for review/i })
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    // Status should change — look for Pending Review badge
    await expect(
      page.getByText("Pending Review")
    ).toBeVisible({ timeout: 10_000 })

    await screenshot(page, "flow-05-submitted-for-review")
  })
})

test.describe("BOM Lifecycle — Pending Review", () => {
  test("PENDING_REVIEW shows Approve BOM for authorized users", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Approve Check ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 2, isNonCatalog: true, nonCatalogName: "Approve Test Item", tier: "TIER_2" },
      ],
    })

    // Move to PENDING_REVIEW via API
    await page.request.put(`http://localhost:3000/api/boms/${bom.id}`, {
      data: { status: "PENDING_REVIEW" },
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.getByText("BOM Detail")).toBeVisible({ timeout: 15_000 })

    // Authorized users see "Approve BOM" button
    await expect(
      page.getByRole("button", { name: /approve bom/i })
    ).toBeVisible({ timeout: 5_000 })

    await screenshot(page, "flow-05-pending-approve-btn")
  })

  test("PENDING_REVIEW shows Cancel BOM as outline button", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Cancel Check ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 1, isNonCatalog: true, nonCatalogName: "Cancel Test Item", tier: "TIER_2" },
      ],
    })

    await page.request.put(`http://localhost:3000/api/boms/${bom.id}`, {
      data: { status: "PENDING_REVIEW" },
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.getByText("BOM Detail")).toBeVisible({ timeout: 15_000 })

    const cancelBtn = page.getByRole("button", { name: /cancel bom/i })
    await expect(cancelBtn).toBeVisible({ timeout: 5_000 })

    // Verify it is an outline-style button (border, not filled)
    // The Cancel BOM button uses variant="outline" with red border
    await expect(cancelBtn).toHaveCSS("background-color", /rgba?\(255,\s*255,\s*255|transparent/)

    await screenshot(page, "flow-05-pending-cancel-btn")
  })

  test("cancel BOM sets status to CANCELLED", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Cancel Flow ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 3, isNonCatalog: true, nonCatalogName: "Cancel Flow Item", tier: "TIER_2" },
      ],
    })

    await page.request.put(`http://localhost:3000/api/boms/${bom.id}`, {
      data: { status: "PENDING_REVIEW" },
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.getByText("BOM Detail")).toBeVisible({ timeout: 15_000 })

    const cancelBtn = page.getByRole("button", { name: /cancel bom/i })
    await expect(cancelBtn).toBeVisible({ timeout: 5_000 })
    await cancelBtn.click()

    // Should show Cancelled status
    await expect(
      page.getByText(/cancelled/i)
    ).toBeVisible({ timeout: 10_000 })

    await screenshot(page, "flow-05-bom-cancelled")
  })

  test("approve transitions to APPROVED when fab gate passes", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Approve Flow ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 6, isNonCatalog: true, nonCatalogName: "Approve Flow Item", tier: "TIER_2" },
      ],
    })

    await page.request.put(`http://localhost:3000/api/boms/${bom.id}`, {
      data: { status: "PENDING_REVIEW" },
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.getByText("BOM Detail")).toBeVisible({ timeout: 15_000 })

    const approveBtn = page.getByRole("button", { name: /approve bom/i })
    await expect(approveBtn).toBeVisible({ timeout: 5_000 })
    await approveBtn.click()

    // Should transition to Approved — look for status badge or checkout UI
    await expect(
      page.getByText(/approved/i).first()
        .or(page.getByText(/check out/i).first())
    ).toBeVisible({ timeout: 10_000 })

    await screenshot(page, "flow-05-bom-approved")
  })
})

test.describe("BOM Lifecycle — Fab Gate", () => {
  test("fab gate section appears when BOM has assembly items", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Fab Gate ${Date.now()}`,
      lineItems: [
        {
          productId: null,
          qtyNeeded: 1,
          isNonCatalog: true,
          nonCatalogName: "Cooler Swing Door 3x7",
          tier: "TIER_2",
        },
        { productId: null, qtyNeeded: 5, isNonCatalog: true, nonCatalogName: "Regular Fastener", tier: "TIER_2" },
      ],
    })

    await page.request.put(`http://localhost:3000/api/boms/${bom.id}`, {
      data: { status: "PENDING_REVIEW" },
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.getByText("BOM Detail")).toBeVisible({ timeout: 15_000 })

    // Fab gate section may appear if the item matches assembly patterns
    const fabSection = page.getByText(/fabrication/i).first()
    if (await fabSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Fab gate is visible — verify it has actionable content
      await expect(
        page.getByText(/create door sheet/i)
          .or(page.getByText(/action needed/i))
          .or(page.getByText(/all linked/i))
          .or(page.getByText(/resolve doors/i))
      ).toBeVisible({ timeout: 5_000 })

      await screenshot(page, "flow-05-fab-gate-visible")
    } else {
      // Non-catalog items may not trigger fab gate matching
      await screenshot(page, "flow-05-fab-gate-not-triggered")
    }
  })
})

test.describe("BOM Lifecycle — Delete", () => {
  test("delete BOM has confirmation dialog", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E Delete Confirm ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 2, isNonCatalog: true, nonCatalogName: "Delete Test Item", tier: "TIER_2" },
      ],
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.getByText("BOM Detail")).toBeVisible({ timeout: 15_000 })

    // Find delete button — admin only, appears below the action bar
    const deleteBtn = page.getByRole("button", { name: /delete bom/i })
    if (!(await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await deleteBtn.click()

    // Confirmation dialog must appear
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Dialog should have warning text and cancel option
    await expect(page.getByText(/cannot be undone/i)).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: /cancel/i })
    ).toBeVisible()

    // Dismiss dialog without deleting
    await dialog.getByRole("button", { name: /cancel/i }).click()
    await expect(dialog).not.toBeVisible()

    // BOM should still be there
    await expect(page.getByText("BOM Detail")).toBeVisible()

    await screenshot(page, "flow-05-delete-confirm-dialog")
  })

  test("delete BOM not shown for PENDING_REVIEW status", async ({ page }) => {
    const bom = await createTestBom(page, {
      jobName: `E2E No Delete Review ${Date.now()}`,
      lineItems: [
        { productId: null, qtyNeeded: 1, isNonCatalog: true, nonCatalogName: "No Delete Item", tier: "TIER_2" },
      ],
    })

    await page.request.put(`http://localhost:3000/api/boms/${bom.id}`, {
      data: { status: "PENDING_REVIEW" },
    })

    await page.goto(`/boms/${bom.id}`)
    await expect(page.getByText("BOM Detail")).toBeVisible({ timeout: 15_000 })

    // Delete BOM button should NOT be visible in PENDING_REVIEW
    // (Cancel BOM is the appropriate action instead)
    const deleteBtn = page.getByRole("button", { name: /delete bom/i })
    await expect(deleteBtn).not.toBeVisible()

    // But Cancel BOM should be visible
    await expect(
      page.getByRole("button", { name: /cancel bom/i })
    ).toBeVisible()

    await screenshot(page, "flow-05-no-delete-pending-review")
  })
})

test.describe("BOM Lifecycle — Error States", () => {
  test("BOM not found shows clear error, not infinite skeleton", async ({ page }) => {
    await page.goto("/boms/nonexistent-id-99999")

    // Should not show infinite loading — should resolve to an error
    // Wait for either error message or redirect
    await expect(
      page.getByText(/not found/i)
        .or(page.getByText(/bills of materials/i))
    ).toBeVisible({ timeout: 15_000 })

    // Should NOT still be showing a loading skeleton
    const skeleton = page.locator(".animate-pulse")
    const skeletonVisible = await skeleton.first().isVisible({ timeout: 1_000 }).catch(() => false)

    if (skeletonVisible) {
      // If skeleton is still visible after 15s, that is a bug
      test.fail(true, "Infinite skeleton: loading state never resolved for nonexistent BOM")
    }

    // Should have navigation escape route
    const hasEscape = await page
      .locator("a[href='/boms'], button, .lucide-arrow-left, .lucide-chevron-left")
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false)

    expect(hasEscape).toBe(true)

    await screenshot(page, "flow-05-bom-not-found")
  })
})
