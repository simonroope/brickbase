import { Before, After } from "@cucumber/cucumber";

Before(async function (this: { init: () => Promise<void> }) {
  await this.init();
});

After(async function (this: { destroy: () => Promise<void> }) {
  await this.destroy();
});
