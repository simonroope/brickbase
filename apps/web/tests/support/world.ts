import { chromium, type Browser, type Page } from "@playwright/test";
import { setWorldConstructor } from "@cucumber/cucumber";

export class CustomWorld {
  page!: Page;
  private browser!: Browser;
  baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  async init() {
    this.browser = await chromium.launch();
    this.page = await this.browser.newPage();
  }

  async destroy() {
    await this.browser?.close();
  }
}

setWorldConstructor(CustomWorld);
