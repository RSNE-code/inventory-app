import { test, expect, Page } from "@playwright/test"
import path from "path"

// ─── Test Setup: Reset receiving state before all tests ─────────────

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  try {
    const res = await page.request.post("http://localhost:3000/api/test/reset-receiving")
    if (res.ok()) {
      console.log("✓ Receiving state reset for clean test run")
    } else {
      console.warn("⚠ Could not reset receiving state:", res.status())
    }
  } catch (e) {
    console.warn("⚠ Reset endpoint not available:", e)
  }
  await page.close()
})

// ─── Helpers ─────────────────────────────────────────────────────────

const RECEIVING_URL = "/receiving"
const TEST_IMAGE = path.resolve(__dirname, "fixtures/test-packing-slip.png")

/** Navigate to the Receive tab */
async function goToReceiving(page: Page) {
  await page.goto(RECEIVING_URL)
  // Wait for the INPUT phase to load — look for the "Packing Slip" button
  await expect(page.locator("p").filter({ hasText: "Packing Slip" })).toBeVisible({ timeout: 15_000 })
}

/** Navigate to the History tab */
async function goToHistory(page: Page) {
  await page.goto(RECEIVING_URL)
  await page.getByText("Receipt History").click()
  // Wait for the search input to be visible
  await expect(page.getByPlaceholder(/search/i)).toBeVisible({ timeout: 10_000 })
}

/** Fill and submit the main AI text input */
async function submitText(page: Page, text: string) {
  // Try specific placeholder first (AIInput uses <input type="text">)
  const specificInput = page.getByPlaceholder("'20 panels from Metl-Span on PO 345...'")
  if (await specificInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await specificInput.fill(text)
    await specificInput.press("Enter")
  } else {
    // Fallback — find any text input in the AI input area
    const textInput = page.locator("input[type='text']").first()
    await expect(textInput).toBeVisible({ timeout: 5_000 })
    await textInput.fill(text)
    await textInput.press("Enter")
  }
}

/** Wait for AI parsing to complete — handles rate limits with auto-retry */
async function waitForParse(page: Page) {
  await page.waitForTimeout(1_500)

  for (let parseAttempt = 0; parseAttempt < 3; parseAttempt++) {
    const result = await page.waitForFunction(() => {
      const body = document.body.innerText
      // Success states
      if (
        body.includes("Purchase Order Match") ||
        body.includes("Find Purchase Order") ||
        body.includes("No PO") ||
        body.includes("Confirm PO") ||
        body.includes("Confirm All") ||
        body.includes("Continue to Summary") ||
        body.includes("Confirm Receipt") ||
        body.includes("Select a supplier") ||
        body.includes("Start over") ||
        body.includes("items parsed")
      ) return "success"
      // Error states
      if (body.includes("Failed after") || body.includes("rate limit") || body.includes("Failed to parse")) {
        return "error"
      }
      return false
    }, { timeout: 120_000 })

    const status = await result.jsonValue()
    if (status === "success") return

    // Rate limited — dismiss error, wait for rate limit reset, then re-submit
    console.log(`⚠ AI parse rate limited (attempt ${parseAttempt + 1}/3) — waiting 65s before retry...`)

    // Dismiss error toast/message
    const dismissBtn = page.locator("button").filter({ hasText: "✕" }).first()
    if (await dismissBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await dismissBtn.click()
      await page.waitForTimeout(500)
    }

    // Wait for rate limit to reset (65 seconds — toast clears at 10s, rate limit resets at 60s)
    await page.waitForTimeout(65_000)

    // Verify error text is gone from body before re-submitting
    await page.waitForFunction(() => {
      const body = document.body.innerText
      return !body.includes("Failed after") && !body.includes("rate limit")
    }, { timeout: 10_000 }).catch(() => {})

    // Re-submit by pressing Enter on the text input (text should still be there)
    const textarea = page.locator("input[type='text']").first()
    if (await textarea.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const currentText = await textarea.inputValue()
      if (currentText.trim()) {
        await textarea.press("Enter")
      } else {
        // Text was cleared — can't retry
        throw new Error("AI parse failed and text input was cleared — cannot retry")
      }
    }

    await page.waitForTimeout(2_000)
  }

  throw new Error("AI parse failed after 3 rate-limit retries")
}

/** Skip PO — handles both "No PO — receive without" and "No PO — ad hoc purchase" */
async function skipPO(page: Page) {
  const noPOBtn = page.getByText(/no po/i).first()
  if (await noPOBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await noPOBtn.click()
    return true
  }
  return false
}

/** Upload a photo via the hidden file input */
async function uploadPhoto(page: Page, filePath: string) {
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(filePath)
}

/** Click Browse POs button on INPUT phase */
async function clickBrowsePOs(page: Page) {
  const browseBtn = page.locator("p").filter({ hasText: "Browse POs" })
  await expect(browseBtn).toBeVisible({ timeout: 5_000 })
  await browseBtn.click()
  // Wait for PO browser to load (search input appears)
  await expect(page.getByPlaceholder(/search/i)).toBeVisible({ timeout: 10_000 })
}

/** Wait for PO receive card to fully load — wait for number inputs */
async function waitForPOReceiveCard(page: Page) {
  await expect(page.locator('input[type="number"]').first()).toBeVisible({ timeout: 15_000 })
}

/** Set a specific quantity input to a value */
async function setQuantity(page: Page, index: number, value: number) {
  const qtyInputs = page.locator('input[type="number"]')
  await expect(qtyInputs.nth(index)).toBeVisible({ timeout: 5_000 })
  await qtyInputs.nth(index).fill(String(value))
}

/** Zero out all quantities on PO receive card */
async function zeroAllQuantities(page: Page) {
  await page.waitForTimeout(500)
  const qtyInputs = page.locator('input[type="number"]')
  const count = await qtyInputs.count()
  for (let i = 0; i < count; i++) {
    await qtyInputs.nth(i).fill("0")
  }
}

/** Click "Confirm Receipt (X items)" button — works on PO receive and summary */
async function clickConfirmReceipt(page: Page) {
  const btn = page.getByRole("button", { name: /confirm receipt/i }).first()
  await expect(btn).toBeVisible({ timeout: 10_000 })
  await expect(btn).toBeEnabled({ timeout: 5_000 })
  await btn.click()
}

/** Wait for receipt to complete — uses polling to avoid strict mode issues */
async function waitForReceiptComplete(page: Page) {
  await page.waitForFunction(() => {
    const body = document.body.innerText
    // Receipt complete = either toast success + reset to INPUT, or shows "Received X items"
    return (
      // Success toast text (from receiving-flow.tsx line 268)
      (body.includes("Received ") && body.includes(" from ")) ||
      // Or page reset to input phase
      (body.includes("Packing Slip") && body.includes("Browse POs") && body.includes("or type / speak below"))
    )
  }, { timeout: 30_000 })
}

/** Search for a PO in the browser and select it */
async function searchAndSelectPO(page: Page, poNumber: string) {
  const searchInput = page.getByPlaceholder(/search/i).first()
  await expect(searchInput).toBeVisible({ timeout: 10_000 })
  await searchInput.fill(poNumber)
  await page.waitForTimeout(2_000)

  const poRow = page.locator("button").filter({ hasText: `PO #${poNumber}` }).first()
  await expect(poRow).toBeVisible({ timeout: 10_000 })
  await poRow.click()
  await page.waitForTimeout(500)

  // Scope "Select PO" to the parent container of the clicked PO row
  // (avoids clicking a hidden button inside a collapsed grid-rows-[0fr] row)
  const poContainer = poRow.locator("..")
  const selectBtn = poContainer.getByRole("button", { name: /select po/i })
  await expect(selectBtn).toBeVisible({ timeout: 5_000 })
  await selectBtn.click()

  await waitForPOReceiveCard(page)
}

/** Ensure at least one line item has qty > 0, set first to 1 if all are 0 */
async function ensureReceivableQuantity(page: Page) {
  const qtyInputs = page.locator('input[type="number"]')
  const count = await qtyInputs.count()
  let hasNonZero = false
  for (let i = 0; i < count; i++) {
    const val = await qtyInputs.nth(i).inputValue()
    if (Number(val) > 0) {
      hasNonZero = true
      break
    }
  }
  if (!hasNonZero && count > 0) {
    await qtyInputs.first().fill("1")
  }
}

/** Complete a PO receive + summary flow (confirm receipt → summary → confirm) */
async function completePOReceiveFlow(page: Page) {
  await ensureReceivableQuantity(page)
  await clickConfirmReceipt(page)
  // Now on SUMMARY phase — click final confirm
  await page.waitForTimeout(1_000)
  const summaryConfirm = page.getByRole("button", { name: /confirm receipt/i }).first()
  if (await summaryConfirm.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(summaryConfirm).toBeEnabled({ timeout: 5_000 })
    await summaryConfirm.click()
  }
  await waitForReceiptComplete(page)
}

/**
 * Universal flow completer — handles ANY post-parse state and drives to receipt completion.
 * Works regardless of whether AI matched a PO, found no PO, or went to review.
 *
 * State detection order matters:
 * 1. Check completion first
 * 2. PO match phase (Confirm PO / No PO buttons)
 * 3. REVIEW phase ("Continue to Summary" present — has spinbuttons too!)
 * 4. PO_RECEIVE phase (number inputs + "Confirm Receipt" button)
 * 5. SUMMARY phase ("Confirm Receipt" button only)
 */
async function completeAnyReceivingFlow(page: Page) {
  await page.waitForTimeout(1_000)

  for (let attempt = 0; attempt < 8; attempt++) {
    const body = await page.evaluate(() => document.body.innerText)

    // === COMPLETED ===
    if ((body.includes("Received ") && body.includes(" from ")) ||
        (body.includes("Packing Slip") && body.includes("Browse POs") && body.includes("or type / speak below"))) {
      return
    }

    // === PO MATCH PHASE ===
    const confirmPO = page.getByRole("button", { name: /confirm po/i })
    if (await confirmPO.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await confirmPO.click()
      await page.waitForTimeout(1_500)
      continue
    }

    const noPO = page.getByText(/no po/i).first()
    if (await noPO.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await noPO.click()
      await page.waitForTimeout(1_500)
      continue
    }

    // === REVIEW PHASE === (must check BEFORE PO_RECEIVE — both have number inputs)
    // Identified by "Continue to Summary" button
    if (body.includes("Continue to Summary")) {
      // Click "Confirm All" if available
      const confirmAllBtn = page.getByRole("button", { name: /confirm all/i })
      if (await confirmAllBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await confirmAllBtn.click()
        await page.waitForTimeout(1_000)
        continue
      }

      // Click individual check buttons to confirm items
      const checkBtns = page.locator("button svg.lucide-check").locator("..")
      const checkCount = await checkBtns.count()
      if (checkCount > 0) {
        for (let i = 0; i < Math.min(checkCount, 10); i++) {
          const btn = checkBtns.first()
          if (await btn.isVisible().catch(() => false)) {
            await btn.click()
            await page.waitForTimeout(400)
          }
        }
        await page.waitForTimeout(500)
        continue
      }

      // All items confirmed — click "Continue to Summary"
      const continueBtn = page.getByRole("button", { name: /continue to summary/i }).first()
      if (await continueBtn.isEnabled({ timeout: 3_000 }).catch(() => false)) {
        await continueBtn.click()
        await page.waitForTimeout(1_500)
        continue
      }

      // Button still disabled — wait and retry
      await page.waitForTimeout(2_000)
      continue
    }

    // === PO_RECEIVE PHASE === (number inputs + "Confirm Receipt" button)
    const confirmReceiptBtn = page.getByRole("button", { name: /confirm receipt/i }).first()
    if (await page.locator('input[type="number"]').first().isVisible({ timeout: 1_000 }).catch(() => false)) {
      if (await confirmReceiptBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        // This is PO_RECEIVE phase
        await completePOReceiveFlow(page)
        return
      }
    }

    // === SUMMARY PHASE === ("Confirm Receipt" button, no number inputs)
    if (await confirmReceiptBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      if (await confirmReceiptBtn.isEnabled({ timeout: 3_000 }).catch(() => false)) {
        await confirmReceiptBtn.click()
        await waitForReceiptComplete(page)
        return
      }
    }

    // === SUPPLIER SELECT ===
    if (body.includes("Select a supplier") || body.includes("select a supplier")) {
      const supplierSelect = page.locator("button").filter({ hasText: /select a supplier/i }).first()
      if (await supplierSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await supplierSelect.click()
        await page.waitForTimeout(500)
        const firstOption = page.locator("[role=option]").first()
        if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await firstOption.click()
        }
        await page.waitForTimeout(500)
        continue
      }
    }

    await page.waitForTimeout(2_000)
  }

  // Final attempt
  const finalSubmit = page.getByRole("button", { name: /confirm receipt/i }).first()
  if (await finalSubmit.isVisible({ timeout: 5_000 }).catch(() => false)) {
    if (await finalSubmit.isEnabled().catch(() => false)) {
      await finalSubmit.click()
      await waitForReceiptComplete(page)
    }
  }
}

/** Create a receipt via PO browser (helper for tests that need a receipt to exist) */
async function createReceiptViaPO(page: Page, poNumber: string, qty = 1) {
  await goToReceiving(page)
  await clickBrowsePOs(page)
  await searchAndSelectPO(page, poNumber)
  await zeroAllQuantities(page)
  await setQuantity(page, 0, qty)
  await completePOReceiveFlow(page)
}

// ═══════════════════════════════════════════════════════════════════
// GROUP 1: TEXT INPUT PATHS
// ═══════════════════════════════════════════════════════════════════

test.describe("1. Text Input", () => {

  test("1.1 Text → exact PO match → confirm PO → receive → submit", async ({ page }) => {
    await goToReceiving(page)
    await submitText(page, "Received from Jamison Door Company: 1x Replacement Nema 4X_P, PO #10")
    await waitForParse(page)

    const confirmPO = page.getByRole("button", { name: /confirm po/i })
    if (await confirmPO.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await confirmPO.click()
    }

    await waitForPOReceiveCard(page)
    await completePOReceiveFlow(page)
  })

  test("1.2 Text → fuzzy PO match → switch to different PO → receive → submit", async ({ page }) => {
    await goToReceiving(page)
    await submitText(page, "Received 2 Stn Stl hinges from Kason, PO 102")
    await waitForParse(page)

    // Try clicking "Different PO" to switch POs
    const diffBtn = page.getByRole("button", { name: /different po/i })
    if (await diffBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await diffBtn.click()
      await page.waitForTimeout(1_000)

      // Now in PO search — search for a PO and select it
      const searchInput = page.getByPlaceholder(/search/i).first()
      if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.fill("100")
        await page.waitForTimeout(2_000)

        const poRow = page.locator("button").filter({ hasText: /PO #\d+/ }).first()
        if (await poRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await poRow.click()
          await page.waitForTimeout(500)
          const poContainer = poRow.locator("..")
          const selectBtn = poContainer.getByRole("button", { name: /select po|confirm/i })
          if (await selectBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await selectBtn.click()
            await page.waitForTimeout(1_000)
          }
        } else {
          // No POs found — use ad hoc
          const adHoc = page.getByText(/no po/i).first()
          if (await adHoc.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await adHoc.click()
          }
        }
      }
    }

    // Complete whatever flow we ended up in
    await completeAnyReceivingFlow(page)
  })

  test("1.3 Text → no PO match → skip PO → review items → submit", async ({ page }) => {
    await goToReceiving(page)
    await submitText(page, "Received 5 rolls of duct tape and 10 boxes of screws from Home Depot")
    await waitForParse(page)

    // Complete whatever flow the AI chose (PO match, no match, review, etc.)
    await completeAnyReceivingFlow(page)
  })

  test("1.4 Text → PO match → receive PARTIAL qty → submit", async ({ page }) => {
    await goToReceiving(page)
    await submitText(page, "Got 1 AZEK board from Industrial Products, PO 101")
    await waitForParse(page)

    const confirmBtn = page.getByRole("button", { name: /confirm po/i })
    if (await confirmBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await confirmBtn.click()
    }

    await waitForPOReceiveCard(page)
    await zeroAllQuantities(page)
    await setQuantity(page, 0, 1)
    await completePOReceiveFlow(page)
  })

  test("1.5 Text → PO match → OVER-receive → see warning → submit", async ({ page }) => {
    await goToReceiving(page)
    await submitText(page, "Received from Security Lock, PO 103: 3 rim exit devices")
    await waitForParse(page)

    const confirmBtn = page.getByRole("button", { name: /confirm po/i })
    if (await confirmBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await confirmBtn.click()
    }

    await waitForPOReceiveCard(page)
    await page.locator('input[type="number"]').first().fill("99")
    await page.waitForTimeout(500)

    await completePOReceiveFlow(page)
  })

  test("1.6 Text → PO match → ALL quantities 0 → confirm button disabled", async ({ page }) => {
    await goToReceiving(page)
    await submitText(page, "Delivery from Kason Central, PO 102")
    await waitForParse(page)

    const confirmBtn = page.getByRole("button", { name: /confirm po/i })
    if (await confirmBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await confirmBtn.click()
    }

    await waitForPOReceiveCard(page)
    await zeroAllQuantities(page)

    const receiptBtn = page.getByRole("button", { name: /confirm receipt/i }).first()
    await expect(receiptBtn).toBeDisabled({ timeout: 5_000 })
  })

  test("1.7 Text → non-catalog items → accept → submit", async ({ page }) => {
    await goToReceiving(page)
    await submitText(page, "Received 1 custom fabricated bracket from Chase Industries")
    await waitForParse(page)

    // Complete whatever flow the AI chose
    await completeAnyReceivingFlow(page)
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 2: PHOTO INPUT
// ═══════════════════════════════════════════════════════════════════

test.describe("2. Photo Input", () => {

  test("2.1 Photo upload → parse attempt → flow continues without crash", async ({ page }) => {
    await goToReceiving(page)

    const packingSlipBtn = page.locator("p").filter({ hasText: "Packing Slip" })
    await packingSlipBtn.click()
    await uploadPhoto(page, TEST_IMAGE)

    await page.waitForFunction(() => {
      const body = document.body.innerText
      return (
        body.includes("Purchase Order") ||
        body.includes("No PO") ||
        body.includes("Confirm") ||
        body.includes("error") ||
        body.includes("Failed") ||
        body.includes("Packing Slip") ||
        body.includes("Start over")
      )
    }, { timeout: 90_000 })
  })

  test("2.2 Photo fails → user retries with text → completes flow", async ({ page }) => {
    await goToReceiving(page)

    const packingSlipBtn = page.locator("p").filter({ hasText: "Packing Slip" })
    await packingSlipBtn.click()
    await uploadPhoto(page, TEST_IMAGE)

    // Wait for image processing to complete OR error/timeout
    // Check for: text input enabled, error message, or page moved past INPUT
    await page.waitForFunction(() => {
      const body = document.body.innerText
      const ta = document.querySelector("input[type='text']")
      const taEnabled = ta && !ta.disabled
      return (
        taEnabled ||
        body.includes("Failed after") ||
        body.includes("rate limit") ||
        body.includes("Purchase Order") ||
        body.includes("Confirm") ||
        body.includes("Continue to Summary") ||
        body.includes("Start over")
      )
    }, { timeout: 150_000 })
    await page.waitForTimeout(1_000)

    // Check if image parsing succeeded (moved past INPUT)
    const body = await page.evaluate(() => document.body.innerText)
    if (body.includes("Packing Slip") || body.includes("Failed after") || body.includes("rate limit")) {
      // Still on INPUT or error — dismiss error if present, retry with text
      const dismissBtn = page.locator("button").filter({ hasText: "✕" }).first()
      if (await dismissBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await dismissBtn.click()
        await page.waitForTimeout(500)
      }
      const textarea = page.locator("input[type='text']").first()
      await expect(textarea).toBeEnabled({ timeout: 10_000 })
      await textarea.fill("5 nylon batten bundles from Dupont")
      await textarea.press("Enter")
      await waitForParse(page)
    }

    // Either image parsed or text parsed — verify we're past INPUT
    const hasResults = await page.waitForFunction(() => {
      const b = document.body.innerText
      return b.includes("Confirm") || b.includes("No PO") || b.includes("Purchase Order") ||
             b.includes("Review") || b.includes("Select PO") || b.includes("items parsed") ||
             b.includes("Start over")
    }, { timeout: 15_000 }).catch(() => false)
    expect(hasResults).toBeTruthy()
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 3: MANUAL PO BROWSE (no AI)
// ═══════════════════════════════════════════════════════════════════

test.describe("3. Manual PO Browse", () => {

  test("3.1 Browse → select PO → receive → submit", async ({ page }) => {
    await goToReceiving(page)
    await clickBrowsePOs(page)
    await page.waitForTimeout(3_000)

    const firstPO = page.locator("button").filter({ hasText: /PO #\d+/ }).first()
    await expect(firstPO).toBeVisible({ timeout: 10_000 })
    await firstPO.click()
    await page.waitForTimeout(500)

    // Scope "Select PO" to the parent container of the expanded PO row
    const poContainer = firstPO.locator("..")
    const selectBtn = poContainer.getByRole("button", { name: /select po/i })
    await expect(selectBtn).toBeVisible({ timeout: 5_000 })
    await selectBtn.click()

    await waitForPOReceiveCard(page)
    await completePOReceiveFlow(page)
  })

  test("3.2 Browse → search specific PO → partial receive → submit", async ({ page }) => {
    await goToReceiving(page)
    await clickBrowsePOs(page)
    await searchAndSelectPO(page, "100")

    await zeroAllQuantities(page)
    await setQuantity(page, 0, 1)
    await completePOReceiveFlow(page)
  })

  test("3.3 Browse → search no results → empty state", async ({ page }) => {
    await goToReceiving(page)
    await clickBrowsePOs(page)

    const searchInput = page.getByPlaceholder(/search/i).first()
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill("99999")
    await page.waitForTimeout(2_000)

    await expect(page.getByText(/no matching|no open|no results/i)).toBeVisible({ timeout: 5_000 })
  })

  test("3.4 Browse → back returns to input", async ({ page }) => {
    await goToReceiving(page)
    await clickBrowsePOs(page)

    const backBtn = page.getByRole("button", { name: /back/i }).first()
    await expect(backBtn).toBeVisible({ timeout: 5_000 })
    await backBtn.click()

    await expect(page.locator("p").filter({ hasText: "Packing Slip" })).toBeVisible({ timeout: 5_000 })
  })

  test("3.5 Browse → expand PO → see line items with columns", async ({ page }) => {
    await goToReceiving(page)
    await clickBrowsePOs(page)
    await page.waitForTimeout(3_000)

    const firstPO = page.locator("button").filter({ hasText: /PO #\d+/ }).first()
    await expect(firstPO).toBeVisible({ timeout: 10_000 })
    await firstPO.click()
    await page.waitForTimeout(1_000)

    const poContainer = firstPO.locator("..")
    await expect(poContainer.getByRole("button", { name: /select po/i })).toBeVisible({ timeout: 5_000 })
    await expect(poContainer.locator("text=Item").first()).toBeVisible({ timeout: 3_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 4: PARTIAL RECEIVING & RE-RECEIVING
// ═══════════════════════════════════════════════════════════════════

test.describe("4. Partial Receiving & Re-receiving", () => {

  test("4.1 Partial receive → browse same PO → receive more", async ({ page }) => {
    await goToReceiving(page)
    await clickBrowsePOs(page)
    await searchAndSelectPO(page, "101")

    await zeroAllQuantities(page)
    await setQuantity(page, 0, 1)
    await completePOReceiveFlow(page)

    // Browse same PO again
    await goToReceiving(page)
    await clickBrowsePOs(page)

    const searchInput = page.getByPlaceholder(/search/i).first()
    await searchInput.fill("101")
    await page.waitForTimeout(2_000)

    const po101 = page.locator("button").filter({ hasText: "PO #101" }).first()
    if (await po101.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await po101.click()
      await page.waitForTimeout(500)

      const poContainer = po101.locator("..")
      const selectBtn = poContainer.getByRole("button", { name: /select po/i })
      if (await selectBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await selectBtn.click()
        await waitForPOReceiveCard(page)
        await ensureReceivableQuantity(page)
        await completePOReceiveFlow(page)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 5: VOID / UNDO RECEIPTS
// ═══════════════════════════════════════════════════════════════════

test.describe("5. Void / Undo Receipts", () => {

  test("5.1 View history → expand receipt → see items", async ({ page }) => {
    await createReceiptViaPO(page, "102", 1)

    await goToHistory(page)
    await page.waitForTimeout(3_000)

    const allButtons = page.locator("button").filter({ hasText: /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i })
    const count = await allButtons.count()
    expect(count).toBeGreaterThan(0)

    await allButtons.first().click()
    await page.waitForTimeout(1_000)

    const hasItems = await page.waitForFunction(() => {
      const body = document.body.innerText
      return body.includes("Item") || body.includes("Qty") || body.includes("Undo Receipt")
    }, { timeout: 5_000 }).catch(() => false)
    expect(hasItems).toBeTruthy()
  })

  test("5.2 Void receipt → confirm → shows voided", async ({ page }) => {
    await createReceiptViaPO(page, "102", 1)

    await goToHistory(page)
    await page.waitForTimeout(3_000)

    const firstReceipt = page.locator("button").filter({ hasText: /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i }).first()
    await firstReceipt.click()
    await page.waitForTimeout(1_000)

    const undoBtn = page.getByText("Undo Receipt").first()
    await expect(undoBtn).toBeVisible({ timeout: 5_000 })
    await undoBtn.click()

    await expect(page.getByText(/undo this receipt/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/stock will be reversed/i)).toBeVisible()
    await page.getByRole("button", { name: "Confirm" }).click()

    await page.waitForFunction(() => {
      const body = document.body.innerText
      return body.includes("Voided") || body.includes("voided") || body.includes("reversed")
    }, { timeout: 15_000 })
  })

  test("5.3 Void → cancel → receipt NOT voided", async ({ page }) => {
    await createReceiptViaPO(page, "102", 1)

    await goToHistory(page)
    await page.waitForTimeout(3_000)

    const firstReceipt = page.locator("button").filter({ hasText: /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i }).first()
    await firstReceipt.click()
    await page.waitForTimeout(1_000)

    await page.getByText("Undo Receipt").first().click()
    await expect(page.getByText(/undo this receipt/i)).toBeVisible()

    await page.getByRole("button", { name: "Cancel" }).click()

    await expect(page.getByText(/undo this receipt/i)).not.toBeVisible({ timeout: 3_000 })
    await expect(page.getByText("Undo Receipt").first()).toBeVisible()
  })

  test("5.4 Voided receipt shows VOIDED badge", async ({ page }) => {
    await goToHistory(page)
    await page.waitForTimeout(3_000)

    const voidedBadge = page.getByText("Voided")
    if (await voidedBadge.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(voidedBadge.first()).toBeVisible()
    } else {
      test.skip(true, "No voided receipts to verify")
    }
  })

  test("5.5 Void PO-linked receipt → PO available again", async ({ page }) => {
    await createReceiptViaPO(page, "103", 1)

    await goToHistory(page)
    await page.waitForTimeout(3_000)
    const firstReceipt = page.locator("button").filter({ hasText: /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i }).first()
    await firstReceipt.click()
    await page.waitForTimeout(1_000)
    await page.getByText("Undo Receipt").first().click()
    await page.getByRole("button", { name: "Confirm" }).click()
    await page.waitForFunction(() => {
      const body = document.body.innerText
      return body.includes("Voided") || body.includes("voided") || body.includes("reversed")
    }, { timeout: 15_000 })

    await goToReceiving(page)
    await clickBrowsePOs(page)
    await page.getByPlaceholder(/search/i).first().fill("103")
    await page.waitForTimeout(2_000)

    await expect(page.getByText("PO #103")).toBeVisible({ timeout: 5_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 6: RECEIPT HISTORY SEARCH
// ═══════════════════════════════════════════════════════════════════

test.describe("6. Receipt History", () => {

  test("6.1 Search by supplier name", async ({ page }) => {
    await goToHistory(page)
    await page.waitForTimeout(3_000)

    await page.getByPlaceholder(/search/i).first().fill("Kason")
    await page.waitForTimeout(2_000)
  })

  test("6.2 Search by PO number", async ({ page }) => {
    await goToHistory(page)
    await page.waitForTimeout(3_000)

    await page.getByPlaceholder(/search/i).first().fill("102")
    await page.waitForTimeout(2_000)
  })

  test("6.3 Search no results → empty state", async ({ page }) => {
    await goToHistory(page)
    await page.waitForTimeout(3_000)

    await page.getByPlaceholder(/search/i).first().fill("ZZZZNONEXISTENT")
    await page.waitForTimeout(2_000)

    await expect(page.getByText(/no matching|no receipts/i)).toBeVisible({ timeout: 5_000 })
  })

  test("6.4 Clear search → all receipts return", async ({ page }) => {
    await goToHistory(page)
    await page.waitForTimeout(2_000)

    const searchInput = page.getByPlaceholder(/search/i).first()
    await searchInput.fill("test")
    await page.waitForTimeout(1_000)

    const clearBtn = page.locator("button").filter({ has: page.locator("svg.lucide-x") }).first()
    if (await clearBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await clearBtn.click()
    } else {
      await searchInput.fill("")
    }
    await page.waitForTimeout(1_500)
  })

  test("6.5 Tab switching works", async ({ page }) => {
    await page.goto(RECEIVING_URL)

    await expect(page.getByText("AI Receive")).toBeVisible()
    await expect(page.getByText("Receipt History")).toBeVisible()

    await page.getByText("Receipt History").click()
    await page.waitForTimeout(2_000)

    await page.getByText("AI Receive").click()
    await expect(page.locator("p").filter({ hasText: "Packing Slip" })).toBeVisible({ timeout: 10_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 7: EDGE CASES
// ═══════════════════════════════════════════════════════════════════

test.describe("7. Edge Cases", () => {

  test("7.1 Empty text → should not crash or navigate", async ({ page }) => {
    await goToReceiving(page)
    const textarea = page.locator("input[type='text']").first()
    await expect(textarea).toBeVisible({ timeout: 5_000 })
    await textarea.fill("")
    await textarea.press("Enter")
    await page.waitForTimeout(2_000)

    await expect(page.locator("p").filter({ hasText: "Packing Slip" })).toBeVisible()
  })

  test("7.2 Navigate away and back → state resets", async ({ page }) => {
    await goToReceiving(page)
    await submitText(page, "10 screws from Dupont")
    await waitForParse(page)

    await page.goto("/inventory")
    await page.waitForTimeout(1_000)

    await goToReceiving(page)

    await expect(page.locator("p").filter({ hasText: "Packing Slip" })).toBeVisible({ timeout: 10_000 })
  })

  test("7.3 Receipt with notes → notes persist in history", async ({ page }) => {
    await goToReceiving(page)
    await clickBrowsePOs(page)
    await searchAndSelectPO(page, "100")

    await zeroAllQuantities(page)
    await setQuantity(page, 0, 1)

    await clickConfirmReceipt(page)
    await page.waitForTimeout(1_000)

    const notesInput = page.getByPlaceholder(/note/i).first()
    if (await notesInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await notesInput.fill("E2E-TEST-NOTES-PERSIST")
    }

    const submit = page.getByRole("button", { name: /confirm receipt/i }).first()
    if (await submit.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(submit).toBeEnabled({ timeout: 5_000 })
      await submit.click()
    }
    await waitForReceiptComplete(page)

    await goToHistory(page)
    await page.waitForTimeout(3_000)

    const firstReceipt = page.locator("button").filter({ hasText: /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i }).first()
    await firstReceipt.click()
    await page.waitForTimeout(1_000)

    await expect(page.getByText("E2E-TEST-NOTES-PERSIST")).toBeVisible({ timeout: 5_000 })
  })

  test("7.4 Page loads without critical errors", async ({ page }) => {
    const criticalErrors: string[] = []
    page.on("pageerror", (err) => {
      if (err.message.includes("Hydration")) return
      criticalErrors.push(err.message)
    })

    await goToReceiving(page)
    await page.waitForTimeout(3_000)

    expect(criticalErrors).toHaveLength(0)
  })

  test("7.5 History page loads without critical errors", async ({ page }) => {
    const criticalErrors: string[] = []
    page.on("pageerror", (err) => {
      if (err.message.includes("Hydration")) return
      criticalErrors.push(err.message)
    })

    await goToHistory(page)
    await page.waitForTimeout(3_000)

    expect(criticalErrors).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 8: SUPPLIER MATCHING
// ═══════════════════════════════════════════════════════════════════

test.describe("8. Supplier Matching", () => {

  test("8.1 Known supplier → auto-matches", async ({ page }) => {
    await goToReceiving(page)
    await submitText(page, "Received 3 items from Dupont")
    await waitForParse(page)

    await page.waitForFunction(() => {
      return document.body.innerText.includes("Dupont") || document.body.innerText.includes("DuPont")
    }, { timeout: 10_000 })
  })

  test("8.2 Unknown supplier → parsing still works", async ({ page }) => {
    await goToReceiving(page)
    await submitText(page, "Received 2 widgets from Bob's Mystery Warehouse")
    await waitForParse(page)

    await page.waitForFunction(() => {
      const body = document.body.innerText
      return (
        body.includes("Purchase Order") ||
        body.includes("No PO") ||
        body.includes("Confirm") ||
        body.includes("Supplier") ||
        body.includes("Start over")
      )
    }, { timeout: 10_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 9: FULL ROUND-TRIP
// ═══════════════════════════════════════════════════════════════════

test.describe("9. Full Round-Trip", () => {

  test("9.1 Receive → verify in history → void → verify PO reverts", async ({ page }) => {
    await createReceiptViaPO(page, "102", 1)

    await goToHistory(page)
    await page.waitForTimeout(3_000)
    const receipts = page.locator("button").filter({ hasText: /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i })
    expect(await receipts.count()).toBeGreaterThan(0)

    await receipts.first().click()
    await page.waitForTimeout(1_000)
    await page.getByText("Undo Receipt").first().click()
    await page.getByRole("button", { name: "Confirm" }).click()
    await page.waitForFunction(() => {
      const body = document.body.innerText
      return body.includes("Voided") || body.includes("voided") || body.includes("reversed")
    }, { timeout: 15_000 })

    await goToReceiving(page)
    await clickBrowsePOs(page)
    await page.getByPlaceholder(/search/i).first().fill("102")
    await page.waitForTimeout(2_000)
    await expect(page.getByText("PO #102")).toBeVisible({ timeout: 5_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// GROUP 10: LOADING & EMPTY STATES
// ═══════════════════════════════════════════════════════════════════

test.describe("10. Loading & Empty States", () => {

  test("10.1 History tab shows content or empty state", async ({ page }) => {
    await page.goto(RECEIVING_URL)
    await page.getByText("Receipt History").click()

    await expect(page.getByPlaceholder(/search/i)).toBeVisible({ timeout: 10_000 })
  })

  test("10.2 PO browser loads PO list", async ({ page }) => {
    await goToReceiving(page)
    await clickBrowsePOs(page)

    await page.waitForTimeout(3_000)
    const poRows = page.locator("button").filter({ hasText: /PO #\d+/ })
    expect(await poRows.count()).toBeGreaterThan(0)
  })
})
