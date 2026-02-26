import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("displays header and main content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Property Assets" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Commercial Real Estate/i })).toBeVisible();
  });

  test("has navigation links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Properties" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
  });
});
