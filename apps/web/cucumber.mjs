const shared = {
  format: ["progress", "html:tests/reports/cucumber.html"],
  formatOptions: { snippetInterface: "async-await" },
  requireModule: ["ts-node/register"],
  require: ["tests/support/**/*.ts", "tests/steps/**/*.ts"],
  publishQuiet: true,
};

const defaultProfile = { ...shared, paths: ["tests/features/**/*.feature"] };
const integration = { ...shared, paths: ["tests/features/integration/**/*.feature"] };
const e2e = { ...shared, paths: ["tests/features/e2e/**/*.feature"] };

export { defaultProfile as default, integration, e2e };
