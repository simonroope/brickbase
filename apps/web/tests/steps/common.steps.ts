import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

Given("the app is running", async function (this: CustomWorld) {
  this.baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
});

When("I navigate to the homepage", async function (this: CustomWorld) {
  await this.page.goto(this.baseUrl);
});

Then("I should see {string} in the page", async function (this: CustomWorld, text: string) {
  await expect(this.page.getByText(text)).toBeVisible();
});

Then("I should see a {string} button or connected address", async function (this: CustomWorld, text: string) {
  const button = this.page.getByRole("button", { name: text });
  const truncatedAddress = this.page.getByText(/0x[a-fA-F0-9]{4}\.\.\.[a-fA-F0-9]{4}/);
  await expect(button.or(truncatedAddress)).toBeVisible();
});

Then("I should see either the property list or an empty state message", async function (this: CustomWorld) {
  const list = this.page.locator('[class*="grid"]');
  const emptyMsg = this.page.getByText(/no properties|configure contract/i);
  await expect(list.or(emptyMsg)).toBeVisible();
});
