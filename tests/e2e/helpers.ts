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

// ─── Test data seeding helpers ──────────────────────────────────────

const BASE = "http://localhost:3000"

/** Get or create a category for test products */
async function getTestCategoryId(page: Page): Promise<string> {
  const res = await page.request.get(`${BASE}/api/categories`)
  if (res.ok()) {
    const json = await res.json()
    const categories = json.data || []
    if (categories.length > 0) return categories[0].id
  }
  throw new Error("No categories found in database")
}

/** Create a real product in inventory for Quick Pick testing */
export async function createTestProduct(page: Page, name?: string) {
  const categoryId = await getTestCategoryId(page)
  const productName = name || `E2E Test Product ${Date.now()}`

  const res = await page.request.post(`${BASE}/api/inventory`, {
    data: {
      name: productName,
      categoryId,
      unitOfMeasure: "ea",
      tier: "TIER_2",
      reorderPoint: 0,
    },
  })

  if (!res.ok()) {
    throw new Error(`Failed to create product: ${res.status()} ${await res.text()}`)
  }

  const json = await res.json()
  return json.data as { id: string; name: string }
}

/** Create an APPROVED BOM with catalog line items for checkout testing */
export async function createApprovedBomWithProduct(page: Page, jobName?: string) {
  const product = await createTestProduct(page, `E2E Checkout Product ${Date.now()}`)

  const bom = await createTestBom(page, {
    jobName: jobName || `E2E Checkout BOM ${Date.now()}`,
    lineItems: [
      { productId: product.id, qtyNeeded: 5, tier: "TIER_2" },
    ],
  })

  // Approve the BOM
  await page.request.put(`${BASE}/api/boms/${bom.id}`, {
    data: { status: "APPROVED" },
  })

  return { bom, product }
}

/** Create an IN_PROGRESS BOM by creating, approving, and checking out an item */
export async function createInProgressBom(page: Page) {
  const { bom, product } = await createApprovedBomWithProduct(
    page,
    `E2E InProgress ${Date.now()}`
  )

  // Get the line item ID from the BOM
  const bomRes = await page.request.get(`${BASE}/api/boms/${bom.id}`)
  if (!bomRes.ok()) throw new Error("Failed to fetch BOM details")
  const bomData = await bomRes.json()
  const lineItem = bomData.data?.lineItems?.[0]
  if (!lineItem) throw new Error("BOM has no line items")

  // Checkout the item — this auto-transitions BOM to IN_PROGRESS
  const checkoutRes = await page.request.post(`${BASE}/api/boms/${bom.id}/checkout`, {
    data: {
      items: [{ bomLineItemId: lineItem.id, type: "CHECKOUT", quantity: 1 }],
    },
  })

  if (!checkoutRes.ok()) {
    const errText = await checkoutRes.text()
    throw new Error(`Failed to checkout: ${checkoutRes.status()} ${errText}`)
  }

  return { bom, product, lineItemId: lineItem.id }
}

/** Create an assembly and advance it through lifecycle stages */
export async function createTestAssembly(
  page: Page,
  options: {
    type?: string
    status?: "AWAITING_APPROVAL" | "APPROVED" | "IN_PRODUCTION" | "COMPLETED" | "SHIPPED"
    jobName?: string
  } = {}
) {
  const {
    type = "DOOR",
    status = "AWAITING_APPROVAL",
    jobName = `E2E Assembly ${Date.now()}`,
  } = options

  // Create assembly
  const createRes = await page.request.post(`${BASE}/api/assemblies`, {
    data: {
      type,
      jobName,
      requiresApproval: true,
      specs: type === "DOOR"
        ? { widthInClear: "36", heightInClear: "84", temperatureType: "COOLER", frameType: "FULL_FRAME" }
        : { width: "48", length: "96" },
    },
  })

  if (!createRes.ok()) {
    throw new Error(`Failed to create assembly: ${createRes.status()} ${await createRes.text()}`)
  }

  const assembly = (await createRes.json()).data

  // Advance through lifecycle stages as needed
  if (status === "AWAITING_APPROVAL") return assembly

  // Approve
  await page.request.patch(`${BASE}/api/assemblies/${assembly.id}`, {
    data: { approvalStatus: "APPROVED" },
  })
  if (status === "APPROVED") return assembly

  // Start build
  await page.request.patch(`${BASE}/api/assemblies/${assembly.id}`, {
    data: { status: "IN_PRODUCTION" },
  })
  if (status === "IN_PRODUCTION") return assembly

  // Complete build
  await page.request.patch(`${BASE}/api/assemblies/${assembly.id}`, {
    data: { status: "COMPLETED" },
  })
  if (status === "COMPLETED") return assembly

  // Ship
  await page.request.patch(`${BASE}/api/assemblies/${assembly.id}`, {
    data: { status: "SHIPPED" },
  })
  return assembly
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
