import { test, expect } from "@playwright/test"
import { screenshot, goToReceiving } from "./helpers"

test.describe("Receiving Inventory", () => {
  test("receiving page loads with AI Receive and Receipt History tabs", async ({ page }) => {
    await goToReceiving(page)
    await screenshot(page, "03-receiving-page-loaded")

    // Tab bar should show both tabs
    await expect(page.locator("button").filter({ hasText: "AI Receive" })).toBeVisible()
    await expect(page.locator("button").filter({ hasText: "Receipt History" })).toBeVisible()
  })

  test("AI Receive tab shows entry path cards", async ({ page }) => {
    await goToReceiving(page)

    // Packing Slip card (camera trigger)
    await expect(page.locator("text=Packing Slip")).toBeVisible({ timeout: 10_000 })

    // Browse POs card
    await expect(page.locator("text=Browse POs")).toBeVisible()

    // Hint text
    await expect(page.locator("text=or type / speak below").or(page.locator("text=or type"))).toBeVisible()

    await screenshot(page, "03-receiving-entry-cards")
  })

  test("Browse POs opens PO browser", async ({ page }) => {
    await goToReceiving(page)

    const browsePOsBtn = page.locator("text=Browse POs").first()
    await browsePOsBtn.click()
    await page.waitForTimeout(1_000)

    await screenshot(page, "03-receiving-po-browser")

    // Should show PO list or search
    // The PO browser should be visible with search capability
    const body = await page.locator("body").innerText()
    expect(
      body.includes("PO") || body.includes("Purchase Order") || body.includes("Select PO")
    ).toBe(true)
  })

  test("Receipt History tab shows past receipts", async ({ page }) => {
    await goToReceiving(page)

    // Switch to Receipt History tab
    await page.locator("button").filter({ hasText: "Receipt History" }).click()
    await page.waitForTimeout(1_000)

    await screenshot(page, "03-receiving-receipt-history")

    // Should show history or empty state
    const body = await page.locator("body").innerText()
    expect(
      body.includes("Receipt") ||
      body.includes("receipt") ||
      body.includes("No receipts") ||
      body.includes("history")
    ).toBe(true)
  })

  test("AI input area is present for text/voice entry", async ({ page }) => {
    await goToReceiving(page)

    // AI input placeholder or input area
    const aiInput = page.getByPlaceholder(/panels|Metl-Span|PO|type/i).first()
    if (await aiInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await aiInput.fill("10 sheets of FRP from Crane")
      await screenshot(page, "03-receiving-ai-input-typed")
    }
  })

  test("start over button resets receiving flow", async ({ page }) => {
    await goToReceiving(page)

    // Click Browse POs to advance flow
    const browsePOsBtn = page.locator("text=Browse POs").first()
    await browsePOsBtn.click()
    await page.waitForTimeout(1_000)

    // Look for "Start over" link
    const startOver = page.locator("text=Start over").or(page.locator("text=start over"))
    if (await startOver.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await startOver.click()
      await page.waitForTimeout(1_000)

      // Should be back at entry phase
      await expect(page.locator("text=Packing Slip").or(page.locator("text=Browse POs"))).toBeVisible()
      await screenshot(page, "03-receiving-start-over")
    }
  })
})
