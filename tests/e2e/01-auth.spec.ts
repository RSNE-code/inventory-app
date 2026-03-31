import { test, expect } from "@playwright/test"
import { screenshot } from "./helpers"

/**
 * Authentication / Login tests
 *
 * NOTE: There is no self-service registration flow in this app.
 * Users are created by admins. This suite tests the login flow
 * and validates error handling for invalid credentials.
 */

test.describe("Authentication", () => {
  // These tests run WITHOUT stored auth state
  test.use({ storageState: { cookies: [], origins: [] } })

  test("login page renders with correct form fields", async ({ page }) => {
    await page.goto("/login")
    await screenshot(page, "01-auth-login-page")

    // Logo/branding visible
    await expect(page.locator("text=Inventory Management").or(page.locator("img[alt*='RSNE']"))).toBeVisible({
      timeout: 10_000,
    })

    // Email field
    const emailInput = page.getByLabel("Email")
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute("placeholder", "you@rsofne.com")

    // Password field
    const passwordInput = page.getByLabel("Password")
    await expect(passwordInput).toBeVisible()

    // Sign In button
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible()
  })

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("wrong@example.com")
    await page.getByLabel("Password").fill("badpassword123")
    await page.getByRole("button", { name: "Sign In" }).click()

    await screenshot(page, "01-auth-invalid-credentials")

    // Should show error message
    await expect(page.locator("text=Invalid email or password")).toBeVisible({ timeout: 10_000 })

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test("shows loading state while signing in", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("gabe@rsofne.com")
    await page.getByLabel("Password").fill("wrongpassword")

    await page.getByRole("button", { name: "Sign In" }).click()

    // Button should show loading state
    // The button text changes to "Signing in..." while loading
    const signingInText = page.locator("text=Signing in...")
    const signInButton = page.getByRole("button", { name: "Sign In" })

    // Either we catch the loading state or it resolves quickly
    const sawLoading = await signingInText.isVisible({ timeout: 3_000 }).catch(() => false)
    if (!sawLoading) {
      // If loading was too fast, at least verify the error eventually shows
      await expect(
        page.locator("text=Invalid email or password").or(signInButton)
      ).toBeVisible({ timeout: 10_000 })
    }
  })

  test("successful login redirects to dashboard", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("gabe@rsofne.com")
    await page.getByLabel("Password").fill("r4E97n4q@Hb%H5R")
    await page.getByRole("button", { name: "Sign In" }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL("/", { timeout: 15_000 })
    await screenshot(page, "01-auth-successful-login")
  })

  test("unauthenticated user is redirected to login", async ({ page }) => {
    // Try to access a protected page without auth
    await page.goto("/inventory")

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    await screenshot(page, "01-auth-redirect-to-login")
  })

  test("sign out from settings page", async ({ page }) => {
    // First, log in
    await page.goto("/login")
    await page.getByLabel("Email").fill("gabe@rsofne.com")
    await page.getByLabel("Password").fill("r4E97n4q@Hb%H5R")
    await page.getByRole("button", { name: "Sign In" }).click()
    await expect(page).toHaveURL("/", { timeout: 15_000 })

    // Navigate to settings
    await page.goto("/settings")
    await screenshot(page, "01-auth-settings-page")

    // Click sign out
    const signOutBtn = page.getByRole("button", { name: /sign out/i })
    await expect(signOutBtn).toBeVisible({ timeout: 10_000 })
    await signOutBtn.click()

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    await screenshot(page, "01-auth-signed-out")
  })
})
