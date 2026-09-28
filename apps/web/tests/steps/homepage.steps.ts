import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

Then("I should see navigation links {string} and {string}", async function (
  this: CustomWorld,
  link1: string,
  link2: string
) {
  await expect(this.page.getByRole("link", { name: link1 })).toBeVisible();
  await expect(this.page.getByRole("link", { name: link2 })).toBeVisible();
});

Then("I should see either the property list or an empty state message", async function (this: CustomWorld) {
  const emptyState = this.page.getByText(/No properties listed yet/i);
  const buyShares = this.page.getByRole("link", { name: "Buy Shares" });
  await expect(emptyState.or(buyShares).first()).toBeVisible();
});
