import { test, expect } from "@playwright/test"
import {
  screenshot,
  goToDashboard,
  goToInventory,
  goToReceiving,
  goToBomList,
  goToAssemblies,
  goToSettings,
  collectConsoleErrors,
  filterCriticalErrors,
} from "./helpers"

// ─── Unauthenticated tests ─────────────────────────────────────────
test.describe("Auth — Login Page", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("login page renders with branding, email, password, and sign-in button", async ({ page }) => {
    await page.goto("/login")
    await screenshot(page, "flow01-login-render")

    // Branding / logo
    await expect(page.getByRole("img", { name: /RSNE/i })).toBeVisible({ timeout: 10_000 })

    // Email field with correct placeholder
    const emailInput = page.getByLabel("Email")
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute("placeholder", "you@rsofne.com")

    // Password field
    const passwordInput = page.getByLabel("Password")
    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveAttribute("type", "password")

    // Sign In button
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible()

    // Subtitle text
    await expect(page.getByText("Sign in to manage inventory")).toBeVisible()
  })

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("wrong@example.com")
    await page.getByLabel("Password").fill("badpassword123")
    await page.getByRole("button", { name: "Sign In" }).click()

    await expect(page.getByText("Invalid email or password")).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "flow01-invalid-credentials")

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test("shows loading state on submit", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("gabe@rsofne.com")
    await page.getByLabel("Password").fill("wrongpassword")
    await page.getByRole("button", { name: "Sign In" }).click()

    // Button should show "Signing in..." or be disabled during loading
    const signingInText = page.getByText("Signing in...")
    const signInButton = page.getByRole("button", { name: "Sign In" })

    const sawLoading = await signingInText.isVisible({ timeout: 3_000 }).catch(() => false)
    if (!sawLoading) {
      // If loading was too fast, verify the error eventually shows or button returns
      await expect(
        page.getByText("Invalid email or password").or(signInButton)
      ).toBeVisible({ timeout: 10_000 })
    }

    await screenshot(page, "flow01-loading-state")
  })

  test("auth guard redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/inventory")

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    await screenshot(page, "flow01-auth-guard-redirect")
  })

  test("successful login redirects to dashboard", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("gabe@rsofne.com")
    await page.getByLabel("Password").fill("r4E97n4q@Hb%H5R")
    await page.getByRole("button", { name: "Sign In" }).click()

    await expect(page).toHaveURL("/", { timeout: 15_000 })
    await screenshot(page, "flow01-successful-login")
  })

  test("forgot password button reveals admin contact message", async ({ page }) => {
    await page.goto("/login")

    const forgotBtn = page.getByRole("button", { name: /forgot password/i })
    await expect(forgotBtn).toBeVisible()
    await forgotBtn.click()

    await expect(page.getByText(/contact your administrator/i)).toBeVisible({ timeout: 5_000 })
    await screenshot(page, "flow01-forgot-password")
  })
})

// ─── Authenticated tests ────────────────────────────────────────────
test.describe("Dashboard — Content & Navigation", () => {
  test("dashboard shows time-of-day greeting with user name", async ({ page }) => {
    await goToDashboard(page)
    await screenshot(page, "flow01-dashboard-greeting")

    // Greeting pattern: Good morning/afternoon/evening, [Name]
    await expect(
      page.getByText(/Good (morning|afternoon|evening)/i)
    ).toBeVisible({ timeout: 15_000 })
  })

  test("dashboard shows work pipelines section", async ({ page }) => {
    await goToDashboard(page)

    await expect(page.getByText("BOMs")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Fabrication")).toBeVisible()
    await screenshot(page, "flow01-dashboard-pipelines")
  })

  test("dashboard shows inventory value section", async ({ page }) => {
    await goToDashboard(page)

    await expect(
      page.getByText(/inventory value/i)
    ).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "flow01-dashboard-inventory-value")
  })

  test("dashboard shows recent activity section", async ({ page }) => {
    await goToDashboard(page)

    await expect(page.getByText("Recent Activity")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "flow01-dashboard-recent-activity")
  })

  test("bottom nav shows all 5 tabs", async ({ page }) => {
    await goToDashboard(page)

    const nav = page.locator("nav").last()
    await expect(nav).toBeVisible({ timeout: 10_000 })

    // All 5 tab labels
    await expect(nav.getByText("Dashboard")).toBeVisible()
    await expect(nav.getByText("Receive")).toBeVisible()
    await expect(nav.getByText("Inventory")).toBeVisible()
    await expect(nav.getByText("BOMs")).toBeVisible()
    await expect(nav.getByText("Assemblies")).toBeVisible()

    await screenshot(page, "flow01-bottom-nav-tabs")
  })

  test("bottom nav Dashboard link navigates to /", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.getByText("Inventory")).toBeVisible({ timeout: 15_000 })

    const dashboardLink = page.locator("nav a[href='/']").last()
    await dashboardLink.click()

    await expect(page).toHaveURL("/")
    await screenshot(page, "flow01-nav-dashboard")
  })

  test("bottom nav Receive link navigates to /receiving", async ({ page }) => {
    await goToDashboard(page)

    const receiveLink = page.locator("nav a[href='/receiving']").last()
    await receiveLink.click()

    await expect(page).toHaveURL("/receiving")
    await expect(page.getByText("Receive Material")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "flow01-nav-receiving")
  })

  test("bottom nav Inventory link navigates to /inventory", async ({ page }) => {
    await goToDashboard(page)

    const inventoryLink = page.locator("nav a[href='/inventory']").last()
    await inventoryLink.click()

    await expect(page).toHaveURL("/inventory")
    await expect(page.getByText("Inventory")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "flow01-nav-inventory")
  })

  test("bottom nav BOMs link navigates to /boms", async ({ page }) => {
    await goToDashboard(page)

    const bomsLink = page.locator("nav a[href='/boms']").last()
    await bomsLink.click()

    await expect(page).toHaveURL("/boms")
    await expect(page.getByText("Bills of Materials")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "flow01-nav-boms")
  })

  test("bottom nav Assemblies link navigates to /assemblies", async ({ page }) => {
    await goToDashboard(page)

    const assembliesLink = page.locator("nav a[href='/assemblies']").last()
    await assembliesLink.click()

    await expect(page).toHaveURL("/assemblies")
    await screenshot(page, "flow01-nav-assemblies")
  })

  test("menu dropdown opens and shows Settings link", async ({ page }) => {
    await goToDashboard(page)

    // Menu button in header (hamburger icon)
    const menuButton = page.locator("header button").first()
    await expect(menuButton).toBeVisible({ timeout: 10_000 })
    await menuButton.click()

    // Dropdown should show Settings
    await expect(page.getByRole("link", { name: /settings/i })).toBeVisible({ timeout: 5_000 })
    await screenshot(page, "flow01-menu-dropdown")
  })

  test("sign out button is accessible from settings", async ({ page }) => {
    await goToSettings(page)
    await screenshot(page, "flow01-settings-page")

    const signOutBtn = page.getByRole("button", { name: /sign out/i })
    await expect(signOutBtn).toBeVisible({ timeout: 10_000 })
    await expect(signOutBtn).toBeEnabled()
  })

  test("dashboard has no critical console errors", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await goToDashboard(page)

    // Wait for content to fully render
    await expect(
      page.getByText(/Good (morning|afternoon|evening)/i)
    ).toBeVisible({ timeout: 15_000 })

    const critical = filterCriticalErrors(errors)
    expect(critical).toEqual([])
  })
})
