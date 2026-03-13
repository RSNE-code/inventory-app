import { test as setup, expect } from "@playwright/test"
import fs from "fs"
import path from "path"

const authFile = path.join(__dirname, ".auth/user.json")

setup("authenticate", async ({ page }) => {
  // Ensure auth dir exists
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  await page.goto("/login")
  await page.getByLabel("Email").fill("gabe@rsofne.com")
  await page.getByLabel("Password").fill("r4E97n4q@Hb%H5R")
  await page.getByRole("button", { name: "Sign In" }).click()

  // Wait for redirect to dashboard
  await expect(page).toHaveURL("/", { timeout: 15_000 })

  // Save signed-in state
  await page.context().storageState({ path: authFile })
})
