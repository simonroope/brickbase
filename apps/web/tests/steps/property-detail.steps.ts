import { When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

const shellTimeout = 15_000;

When("I navigate to the property detail page for asset {int}", async function (this: CustomWorld, assetId: number) {
  await this.page.goto(`${this.baseUrl}/asset-property/${assetId}`);
});

Then("I should see the app shell", async function (this: CustomWorld) {
  await expect(this.page.getByRole("link", { name: "Property Assets" })).toBeVisible({
    timeout: shellTimeout,
  });
});

Then("I should see the back to properties link", async function (this: CustomWorld) {
  await expect(this.page.getByRole("link", { name: /Back to properties/i })).toBeVisible({
    timeout: shellTimeout,
  });
});

Then("I should see property details or property name", async function (this: CustomWorld) {
  await expect(
    this.page.getByText(/Lyons House|Capital Value|Share Price/i)
  ).toBeVisible();
});

Then("I should see the property not found message", async function (this: CustomWorld) {
  await expect(
    this.page.getByText(/Property not found|no shares created yet/i)
  ).toBeVisible();
});
