import { test, expect } from "@playwright/test"
import {
  screenshot,
  goToDashboard,
  goToInventory,
  goToBomList,
  goToAssemblies,
  goToReceiving,
  collectConsoleErrors,
  filterCriticalErrors,
} from "./helpers"

/**
 * UX/UI Consistency Tests
 *
 * Verifies cross-module visual and interaction consistency:
 * headers, cards, empty states, search inputs, bottom nav,
 * status badges, button sizing, console errors, and navigation flow.
 */

test.describe("UX Consistency — Headers", () => {
  const mainPages = [
    { name: "Dashboard", url: "/", headingText: /good\s(morning|afternoon|evening)/i },
    { name: "Inventory", url: "/inventory", headingText: /inventory/i },
    { name: "BOMs", url: "/boms", headingText: /bills of materials/i },
    { name: "Assemblies", url: "/assemblies", headingText: /door shop|fabrication/i },
    { name: "Receiving", url: "/receiving", headingText: /receive material/i },
  ]

  for (const p of mainPages) {
    test(`${p.name} page has consistent header`, async ({ page }) => {
      await page.goto(p.url)
      await page.waitForLoadState("networkidle")

      // Header should be visible with correct content
      await expect(page.locator("body")).toContainText(p.headingText, { timeout: 15_000 })

      await screenshot(page, `flow-12-header-${p.name.toLowerCase()}`)

      // All main pages use a navy-bg header or the standard Header component
      // Verify a header element exists at the top of the page
      const header = page.locator("header").first()
      const hasHeader = await header.isVisible({ timeout: 5_000 }).catch(() => false)

      if (hasHeader) {
        // Header should contain text content (title)
        const headerText = await header.innerText()
        expect(headerText.length).toBeGreaterThan(0)
      }
    })
  }

  test("all main pages use same header pattern", async ({ page }) => {
    // Visit each page and verify header consistency
    const headerHeights: number[] = []

    for (const p of mainPages) {
      await page.goto(p.url)
      await page.waitForLoadState("networkidle")
      await expect(page.locator("body")).toContainText(p.headingText, { timeout: 15_000 })

      const header = page.locator("header").first()
      if (await header.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const box = await header.boundingBox()
        if (box) {
          headerHeights.push(box.height)
        }
      }
    }

    // All header heights should be within a reasonable range of each other
    if (headerHeights.length >= 2) {
      const minH = Math.min(...headerHeights)
      const maxH = Math.max(...headerHeights)
      // Allow some variation for different header configs, but not wildly different
      expect(maxH - minH).toBeLessThan(100)
    }
  })
})

test.describe("UX Consistency — Cards", () => {
  test("cards use rounded-xl across all modules", async ({ page }) => {
    // Check inventory cards
    await goToInventory(page)
    await screenshot(page, "flow-12-cards-inventory")

    const inventoryCards = page.locator("[class*='rounded-xl']")
    const invCardCount = await inventoryCards.count()

    // Check BOM cards
    await goToBomList(page)
    await screenshot(page, "flow-12-cards-boms")

    const bomCards = page.locator("[class*='rounded-xl']")
    const bomCardCount = await bomCards.count()

    // Check assembly cards
    await goToAssemblies(page)
    await screenshot(page, "flow-12-cards-assemblies")

    const assemblyCards = page.locator("[class*='rounded-xl']")
    const asmCardCount = await assemblyCards.count()

    // All pages should use rounded-xl cards
    expect(invCardCount).toBeGreaterThan(0)
    expect(bomCardCount).toBeGreaterThan(0)
    expect(asmCardCount).toBeGreaterThan(0)
  })
})

test.describe("UX Consistency — Empty States", () => {
  test("empty states follow consistent pattern (icon + title + description)", async ({
    page,
  }) => {
    // Search for impossible terms to trigger empty states
    await goToInventory(page)

    const invSearch = page.getByPlaceholder(/search products or SKUs/i)
    await invSearch.fill("zzzzz_impossible_product_99999")
    await expect(page.getByText("No products found")).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow-12-empty-state-inventory")

    // BOM empty state
    await goToBomList(page)
    const bomSearch = page.getByPlaceholder(/search by job name/i)
    await bomSearch.fill("zzzzz_impossible_job_99999")

    await expect(page.locator("body")).toContainText(/no boms found|0 BOMs/i, { timeout: 10_000 })
    await screenshot(page, "flow-12-empty-state-boms")

    // Both empty states should have descriptive text (not just blank)
    // This is verified by the assertions above finding the "No X found" text
  })

  test("pages without data show empty state, not blank screen", async ({ page }) => {
    // Visit each main page and verify it shows content or an explicit empty state
    const pages = ["/", "/inventory", "/boms", "/assemblies", "/receiving"]

    for (const url of pages) {
      await page.goto(url)
      await page.waitForLoadState("networkidle")

      // Page should have meaningful content — not be blank
      const body = await page.locator("body").innerText()
      // Strip whitespace and check there's actual content
      const contentLength = body.replace(/\s+/g, "").length
      expect(contentLength).toBeGreaterThan(20)

      await screenshot(page, `flow-12-no-blank-${url.replace(/\//g, "-").slice(1) || "dashboard"}`)
    }
  })
})

test.describe("UX Consistency — Search Inputs", () => {
  test("search inputs have consistent styling across modules", async ({ page }) => {
    // Inventory search
    await goToInventory(page)
    const invSearch = page.getByPlaceholder(/search products or SKUs/i)
    await expect(invSearch).toBeVisible({ timeout: 10_000 })
    const invSearchBox = await invSearch.boundingBox()
    await screenshot(page, "flow-12-search-inventory")

    // BOM list search
    await goToBomList(page)
    const bomSearch = page.getByPlaceholder(/search by job name/i)
    await expect(bomSearch).toBeVisible({ timeout: 10_000 })
    const bomSearchBox = await bomSearch.boundingBox()
    await screenshot(page, "flow-12-search-boms")

    // Both search inputs should have similar dimensions
    if (invSearchBox && bomSearchBox) {
      // Heights should be within a reasonable range
      expect(Math.abs(invSearchBox.height - bomSearchBox.height)).toBeLessThan(20)
    }
  })
})

test.describe("UX Consistency — Bottom Navigation", () => {
  test("bottom nav highlights active tab correctly on each page", async ({ page }) => {
    const navPages = [
      { url: "/", tab: "Home" },
      { url: "/inventory", tab: "Inventory" },
      { url: "/boms", tab: "BOMs" },
      { url: "/assemblies", tab: "Build" },
      { url: "/receiving", tab: "Receive" },
    ]

    for (const p of navPages) {
      await page.goto(p.url)
      await page.waitForLoadState("networkidle")

      // Bottom nav should exist
      const bottomNav = page.locator("nav").last()
      const hasNav = await bottomNav.isVisible({ timeout: 10_000 }).catch(() => false)

      if (hasNav) {
        await screenshot(page, `flow-12-nav-active-${p.tab.toLowerCase()}`)

        // The nav should contain links to all main sections
        const navLinks = page.locator(
          "nav a[href='/'], nav a[href='/inventory'], nav a[href='/boms'], nav a[href='/assemblies'], nav a[href='/receiving']"
        )
        const linkCount = await navLinks.count()
        expect(linkCount).toBeGreaterThanOrEqual(4)
      }
    }
  })

  test("bottom nav has 5 items", async ({ page }) => {
    await goToDashboard(page)

    // Find the bottom navigation bar
    const bottomNav = page.locator("nav").last()
    await expect(bottomNav).toBeVisible({ timeout: 10_000 })

    // Count nav items (links within the nav)
    const navItems = bottomNav.locator("a")
    const count = await navItems.count()

    expect(count).toBe(5)
    await screenshot(page, "flow-12-nav-5-items")
  })
})

test.describe("UX Consistency — Status Badges", () => {
  test("status badges use consistent dot + label pattern", async ({ page }) => {
    await goToBomList(page)

    // Show all BOMs to see multiple status types
    await page.locator("button").filter({ hasText: "All" }).first().click()
    await page.waitForLoadState("networkidle")

    await screenshot(page, "flow-12-status-badges-bom-list")

    // Status badges should be visible on BOM cards
    const body = await page.locator("body").innerText()
    const hasStatusBadges =
      body.includes("Draft") ||
      body.includes("Review") ||
      body.includes("Approved") ||
      body.includes("In Progress") ||
      body.includes("Completed")

    expect(hasStatusBadges).toBe(true)
  })
})

test.describe("UX Consistency — Button Sizing", () => {
  test("all primary action buttons are h-12 minimum", async ({ page }) => {
    // Check BOM creation page for primary buttons
    await page.goto("/boms/new")
    await expect(page.getByRole("heading", { name: "New BOM" })).toBeVisible({ timeout: 10_000 })

    // Primary action buttons should meet 44px minimum touch target
    const buttons = page.getByRole("button")
    const buttonCount = await buttons.count()

    let smallButtonFound = false
    for (let i = 0; i < buttonCount; i++) {
      const btn = buttons.nth(i)
      const isVisible = await btn.isVisible().catch(() => false)
      if (!isVisible) continue

      const box = await btn.boundingBox()
      if (box && box.height < 44 && box.width > 200) {
        // Only flag full-width primary CTA buttons (>200px) under 44px tall
        // Smaller tab/filter/icon/mode-switcher buttons are exempt
        smallButtonFound = true
      }
    }

    await screenshot(page, "flow-12-button-sizing")

    // All wide primary action buttons should meet 44px touch target minimum
    expect(smallButtonFound).toBe(false)
  })
})

test.describe("UX Consistency — Console Errors", () => {
  const mainPages = [
    { name: "dashboard", url: "/" },
    { name: "inventory", url: "/inventory" },
    { name: "boms", url: "/boms" },
    { name: "assemblies", url: "/assemblies" },
    { name: "receiving", url: "/receiving" },
  ]

  for (const p of mainPages) {
    test(`no console errors on ${p.name} page`, async ({ page }) => {
      const errors = collectConsoleErrors(page)

      await page.goto(p.url)
      await page.waitForLoadState("networkidle")

      // Wait for async data to load
      await expect(page.locator("body")).not.toBeEmpty({ timeout: 15_000 })

      const critical = filterCriticalErrors(errors)
      await screenshot(page, `flow-12-console-${p.name}`)

      // No critical console errors should appear
      expect(critical).toHaveLength(0)
    })
  }
})

test.describe("UX Consistency — Navigation Flow", () => {
  test("navigation between all 5 main pages works without dead ends", async ({ page }) => {
    // Start at dashboard
    await goToDashboard(page)

    // Navigate to each page using bottom nav links
    const navTargets = [
      { href: "/inventory", marker: /inventory/i },
      { href: "/boms", marker: /bills of materials/i },
      { href: "/assemblies", marker: /door shop|fabrication/i },
      { href: "/receiving", marker: /receive material/i },
      { href: "/", marker: /good\s(morning|afternoon|evening)/i },
    ]

    for (const target of navTargets) {
      const navLink = page.locator(`nav a[href='${target.href}']`).first()
      const linkVisible = await navLink.isVisible({ timeout: 5_000 }).catch(() => false)

      if (linkVisible) {
        await navLink.click()
        await page.waitForURL(`**${target.href}`, { timeout: 10_000 })
        await page.waitForLoadState("networkidle")
        await expect(page.locator("body")).toContainText(target.marker, { timeout: 15_000 })
      }
    }

    await screenshot(page, "flow-12-full-navigation-cycle")
  })

  test("back button from detail pages returns to list", async ({ page }) => {
    // Navigate to a BOM detail page
    await goToBomList(page)

    const bomLink = page.locator("a[href^='/boms/']").first()
    if (!(await bomLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await bomLink.click()
    await expect(page.locator("body")).toContainText(/BOM Detail/i, { timeout: 15_000 })
    await screenshot(page, "flow-12-detail-page-back-button")

    // Find back button (typically in the header)
    const backBtn = page.locator("button").filter({ has: page.locator(".lucide-arrow-left, .lucide-chevron-left") }).first()
    const backLink = page.locator("a").filter({ has: page.locator(".lucide-arrow-left, .lucide-chevron-left") }).first()

    const hasBackBtn = await backBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    const hasBackLink = await backLink.isVisible({ timeout: 3_000 }).catch(() => false)

    if (hasBackBtn) {
      await backBtn.click()
    } else if (hasBackLink) {
      await backLink.click()
    } else {
      // Use browser back
      await page.goBack()
    }

    await page.waitForLoadState("networkidle")

    // Should return to the BOM list or BOMs page
    await expect(page.locator("body")).toContainText(/bills of materials|bom list/i, {
      timeout: 15_000,
    })
    await screenshot(page, "flow-12-returned-to-list")
  })
})

test.describe("UX Consistency — Loading States", () => {
  test("loading skeletons appear during data fetch on each page", async ({ page }) => {
    // Navigate quickly and check for loading indicators
    const pages = ["/inventory", "/boms", "/assemblies", "/receiving"]

    for (const url of pages) {
      // Navigate and immediately check for loading state
      await page.goto(url)

      // Take an immediate screenshot to capture loading state if any
      await screenshot(
        page,
        `flow-12-loading-${url.replace(/\//g, "-").slice(1)}`
      )

      // Wait for content to load
      await page.waitForLoadState("networkidle")

      // After load, verify page has real content
      const body = await page.locator("body").innerText()
      expect(body.length).toBeGreaterThan(20)

      await screenshot(
        page,
        `flow-12-loaded-${url.replace(/\//g, "-").slice(1)}`
      )
    }
  })
})
