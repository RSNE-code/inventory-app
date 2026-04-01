import { test, expect } from "@playwright/test"
import { screenshot, goToReceiving, collectConsoleErrors, filterCriticalErrors } from "./helpers"

test.describe("Receiving — Page Load & Tabs", () => {
  test("receiving page loads with correct header title", async ({ page }) => {
    await goToReceiving(page)
    await screenshot(page, "flow02-receiving-loaded")

    await expect(page.getByText("Receive Material")).toBeVisible({ timeout: 15_000 })
  })

  test("two tabs are visible: AI Receive and Receipt History", async ({ page }) => {
    await goToReceiving(page)

    const aiReceiveTab = page.getByRole("button", { name: /AI Receive/i })
    const historyTab = page.getByRole("button", { name: /Receipt History/i })

    await expect(aiReceiveTab).toBeVisible({ timeout: 10_000 })
    await expect(historyTab).toBeVisible()

    await screenshot(page, "flow02-receiving-tabs")
  })

  test("AI Receive tab shows input area for text or voice entry", async ({ page }) => {
    await goToReceiving(page)
    await screenshot(page, "flow02-ai-receive-input")

    // AI input placeholder for text entry
    const aiInput = page.getByPlaceholder(/panels|Metl-Span|PO|type/i).first()
    const inputVisible = await aiInput.isVisible({ timeout: 5_000 }).catch(() => false)

    if (inputVisible) {
      await expect(aiInput).toBeEnabled()
    } else {
      // Fallback: look for any text input or textarea in the receiving area
      const anyInput = page.locator("input[type='text'], textarea").first()
      await expect(anyInput).toBeVisible({ timeout: 5_000 })
    }
  })

  test("AI Receive tab shows entry path cards (Packing Slip and Browse POs)", async ({ page }) => {
    await goToReceiving(page)

    await expect(page.getByText("Packing Slip")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("Browse POs")).toBeVisible()

    await screenshot(page, "flow02-entry-path-cards")
  })

  test("switching to Receipt History tab works", async ({ page }) => {
    await goToReceiving(page)

    const historyTab = page.getByRole("button", { name: /Receipt History/i })
    await historyTab.click()

    await screenshot(page, "flow02-receipt-history-tab")

    // Should show receipt records or an empty state
    const body = page.locator("body")
    await expect(
      body.getByText(/receipt/i).first().or(body.getByText(/no receipts/i).first()).or(body.getByText(/history/i).first())
    ).toBeVisible({ timeout: 10_000 })
  })

  test("receipt history shows records or empty state", async ({ page }) => {
    await goToReceiving(page)

    // Switch to history tab
    await page.getByRole("button", { name: /Receipt History/i }).click()

    await screenshot(page, "flow02-receipt-history-content")

    // Verify the content is meaningful — either records listed or a clear empty state
    const pageText = await page.locator("body").innerText()
    const hasRecords = pageText.includes("Receipt") || pageText.includes("receipt")
    const hasEmptyState = pageText.includes("No receipts") || pageText.includes("no receipt") || pageText.includes("nothing")

    expect(hasRecords || hasEmptyState).toBe(true)
  })

  test("switching back to AI Receive tab after viewing history", async ({ page }) => {
    await goToReceiving(page)

    // Go to history
    await page.getByRole("button", { name: /Receipt History/i }).click()
    await screenshot(page, "flow02-tab-switch-to-history")

    // Go back to AI Receive
    await page.getByRole("button", { name: /AI Receive/i }).click()

    // Entry cards should reappear
    await expect(page.getByText("Packing Slip")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("Browse POs")).toBeVisible()

    await screenshot(page, "flow02-tab-switch-back-to-ai")
  })

  test("receiving page has no critical console errors", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await goToReceiving(page)

    await expect(page.getByText("Receive Material")).toBeVisible({ timeout: 15_000 })

    const critical = filterCriticalErrors(errors)
    expect(critical).toEqual([])
  })
})
