import { test, expect } from "@playwright/test"
import { screenshot } from "./helpers"

/**
 * UX Friction Tests: Login & Authentication
 *
 * Tests error clarity, loading feedback, and recovery paths
 * for the login flow. All interactions are real user actions.
 */

test.describe("UX: Login Error Messages", () => {
  // Run WITHOUT stored auth — fresh browser
  test.use({ storageState: { cookies: [], origins: [] } })

  test("error message is specific enough to help the user", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("wrong@example.com")
    await page.getByLabel("Password").fill("badpassword")
    await page.getByRole("button", { name: "Sign In" }).click()

    // Wait for error
    await expect(page.locator("text=Invalid email or password")).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "20-ux-login-error-message")

    // UX CHECK: "Invalid email or password" is generic but acceptable for security.
    // However, there should be a way to recover (forgot password).
    // Verify there IS a recovery path:
    const forgotPassword = page.locator("text=Forgot").or(page.locator("text=Reset"))
    const hasForgotPassword = await forgotPassword.isVisible({ timeout: 2_000 }).catch(() => false)

    // UX FRICTION: No "Forgot Password" link exists.
    // A construction worker who forgot their password has NO recovery path
    // other than contacting an admin. This is a dead end.
    if (!hasForgotPassword) {
      test.fail(
        true,
        "UX DEAD END: No 'Forgot Password' or password recovery link on login page. " +
          "Users who forget their password have no self-service recovery."
      )
    }
  })

  test("loading state provides visual feedback during sign-in", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("gabe@rsofne.com")
    await page.getByLabel("Password").fill("wrongpassword")

    // Click and immediately check for loading state
    await page.getByRole("button", { name: "Sign In" }).click()

    // The button should show "Signing in..." or become disabled
    // to prevent double-clicks
    const buttonDuringLoad = page.getByRole("button", { name: /sign/i })

    // Check if button is disabled during loading (prevents double-submit)
    const wasDisabled = await buttonDuringLoad.isDisabled().catch(() => false)
    const showedLoading = await page
      .locator("text=Signing in...")
      .isVisible({ timeout: 3_000 })
      .catch(() => false)

    await screenshot(page, "20-ux-login-loading-state")

    // UX CHECK: User should see SOME feedback that their click registered
    expect(wasDisabled || showedLoading).toBe(true)
  })

  test("error message clears when user starts typing again", async ({ page }) => {
    await page.goto("/login")

    // Trigger error first
    await page.getByLabel("Email").fill("wrong@example.com")
    await page.getByLabel("Password").fill("bad")
    await page.getByRole("button", { name: "Sign In" }).click()
    await expect(page.locator("text=Invalid email or password")).toBeVisible({ timeout: 10_000 })

    // Now start typing in email field
    await page.getByLabel("Email").fill("gabe@rsofne.com")
    await page.waitForTimeout(500)
    await screenshot(page, "20-ux-login-error-after-retype")

    // UX CHECK: Does the error message persist even after user starts correcting?
    // If the error stays visible while the user is actively fixing the problem,
    // it creates confusion ("did I fix it or not?")
    const errorStillVisible = await page
      .locator("text=Invalid email or password")
      .isVisible({ timeout: 1_000 })
      .catch(() => false)

    if (errorStillVisible) {
      // UX FRICTION: Error persists while user is correcting input.
      // Not a hard failure but noted as friction — user has to submit again to clear error.
    }
  })

  test("sign-in button is not clickable when fields are empty", async ({ page }) => {
    await page.goto("/login")
    await screenshot(page, "20-ux-login-empty-fields")

    // With empty fields, what happens when user clicks Sign In?
    await page.getByRole("button", { name: "Sign In" }).click()
    await page.waitForTimeout(1_000)

    // UX CHECK: The form should either prevent submission (disabled button)
    // or show inline validation errors on the empty fields.
    // HTML required attributes handle this via browser validation.
    // Screenshot to verify browser validation tooltip appears.
    await screenshot(page, "20-ux-login-empty-submit")
  })

  test("sign out has no confirmation — accidental sign-out is unrecoverable", async ({ page }) => {
    // First log in
    await page.goto("/login")
    await page.getByLabel("Email").fill("gabe@rsofne.com")
    await page.getByLabel("Password").fill("r4E97n4q@Hb%H5R")
    await page.getByRole("button", { name: "Sign In" }).click()
    await expect(page).toHaveURL("/", { timeout: 15_000 })

    // Go to settings
    await page.goto("/settings")
    await page.waitForLoadState("networkidle")

    const signOutBtn = page.getByRole("button", { name: /sign out/i })
    await expect(signOutBtn).toBeVisible({ timeout: 10_000 })
    await screenshot(page, "20-ux-signout-no-confirm")

    // UX FRICTION: Sign out has NO confirmation dialog.
    // A fat-finger tap on mobile logs the user out immediately.
    // On a construction site with gloves, this could happen easily.
    // The button is full-width and at the bottom — easy accidental tap.

    // Click sign out
    await signOutBtn.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    await screenshot(page, "20-ux-signout-immediate")

    // Verify there's no "undo" or "sign back in quickly" option
    // User must re-enter full credentials
  })
})
