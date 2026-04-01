import { Page, expect } from "@playwright/test"
import path from "path"
import fs from "fs"

// ─── Screenshot helper ──────────────────────────────────────────────
const SCREENSHOT_DIR = path.join(__dirname, "screenshots")

export async function screenshot(page: Page, name: string) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_")
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${sanitized}.png`),
    fullPage: true,
  })
}

// ─── Navigation helpers ─────────────────────────────────────────────

export async function goToDashboard(page: Page) {
  await page.goto("/")
  await page.waitForLoadState("networkidle")
}

export async function goToInventory(page: Page) {
  await page.goto("/inventory")
  await expect(
    page.getByRole("heading", { name: "Product Catalog" })
  ).toBeVisible({ timeout: 15_000 })
}

export async function goToBomList(page: Page) {
  await page.goto("/boms")
  await expect(page.locator("text=Bills of Materials")).toBeVisible({ timeout: 15_000 })
  await page.locator("button").filter({ hasText: "BOM List" }).click()
  await page.waitForTimeout(500)
}

export async function goToAssemblies(page: Page) {
  await page.goto("/assemblies")
  await expect(page.locator("text=Door Shop").or(page.locator("text=Fabrication")).first()).toBeVisible({
    timeout: 15_000,
  })
}

export async function goToReceiving(page: Page) {
  await page.goto("/receiving")
  await expect(page.locator("text=Receive Material")).toBeVisible({ timeout: 15_000 })
}

export async function goToSettings(page: Page) {
  await page.goto("/settings")
  await expect(page.locator("text=More").or(page.locator("text=Settings"))).toBeVisible({
    timeout: 15_000,
  })
}

// ─── Wait helpers ───────────────────────────────────────────────────

export async function waitForPageLoad(page: Page, textMarker: string, timeout = 15_000) {
  await expect(page.locator(`text=${textMarker}`)).toBeVisible({ timeout })
}

export async function waitForToast(page: Page, partialText?: string, timeout = 10_000) {
  if (partialText) {
    await expect(page.locator(`text=${partialText}`)).toBeVisible({ timeout })
  } else {
    // Generic toast container
    await page.waitForTimeout(2_000)
  }
}

// ─── API helpers ────────────────────────────────────────────────────

/** Create a BOM via API for testing */
export async function createTestBom(
  page: Page,
  options: {
    jobName?: string
    status?: string
    lineItems?: Array<{
      productId?: string | null
      qtyNeeded: number
      isNonCatalog?: boolean
      nonCatalogName?: string
      tier?: string
    }>
  } = {}
) {
  const {
    jobName = `E2E Test BOM ${Date.now()}`,
    lineItems = [
      {
        productId: null,
        qtyNeeded: 5,
        isNonCatalog: true,
        nonCatalogName: "E2E Test Item",
        tier: "TIER_2",
      },
    ],
  } = options

  const res = await page.request.post("http://localhost:3000/api/boms", {
    data: { jobName, lineItems },
  })

  if (!res.ok()) {
    throw new Error(`Failed to create test BOM: ${res.status()} ${await res.text()}`)
  }

  const json = await res.json()
  return json.data as { id: string; jobName: string; status: string }
}

/** Get a product from inventory for testing */
export async function getTestProduct(page: Page) {
  const res = await page.request.get("http://localhost:3000/api/inventory?limit=1")
  if (!res.ok()) return null
  const json = await res.json()
  return json.data?.[0] ?? null
}

/** Get first BOM by status */
export async function getBomByStatus(page: Page, status: string) {
  const res = await page.request.get(
    `http://localhost:3000/api/boms?status=${status}&limit=1`
  )
  if (!res.ok()) return null
  const json = await res.json()
  return json.data?.[0] ?? null
}

/** Get assemblies list */
export async function getAssemblies(page: Page, type?: string) {
  const url = type
    ? `http://localhost:3000/api/assemblies?type=${type}`
    : "http://localhost:3000/api/assemblies"
  const res = await page.request.get(url)
  if (!res.ok()) return []
  const json = await res.json()
  return json.data ?? []
}

// ─── Console error collector ────────────────────────────────────────

export function collectConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text())
  })
  return errors
}

export function filterCriticalErrors(errors: string[]) {
  return errors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("404") &&
      !e.includes("hydrat") &&
      !e.includes("Warning:") &&
      !e.includes("chunk")
  )
}
