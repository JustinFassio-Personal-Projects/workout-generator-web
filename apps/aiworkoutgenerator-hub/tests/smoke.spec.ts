import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("home page loads and shows hero", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status(), "Home page should return 200").toBe(200);
    await expect(page).toHaveTitle(/AI Workout Generator/i);
    await expect(
      page.getByRole("heading", {
        name: /Elevate Your Training|Welcome back|AI Intelligence|train smarter/i,
      }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("login page loads", async ({ page }) => {
    const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
    expect(response?.status(), "Login page should return 200").toBe(200);
    await expect(
      page.getByRole("heading", { name: /Welcome to AI Workout Generator/i })
        .or(page.getByRole("tab", { name: /Sign In/i }))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("pricing page loads", async ({ page }) => {
    const response = await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    expect(response?.status(), "Pricing page should return 200").toBe(200);
    await expect(
      page.getByRole("heading", { name: /Choose Your Plan/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("generate page is reachable", async ({ page }) => {
    const response = await page.goto("/generate", { waitUntil: "domcontentloaded" });
    expect(response?.status(), "Generate page should not return 5xx").toBeLessThan(500);
  });

  test("workouts page is reachable", async ({ page }) => {
    const response = await page.goto("/workouts", { waitUntil: "domcontentloaded" });
    expect(response?.status(), "Workouts page should not return 5xx").toBeLessThan(500);
  });
});
