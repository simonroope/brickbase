module.exports = {
  format: ["progress", "html:tests/reports/cucumber.html"],
  formatOptions: { snippetInterface: "async-await" },
  paths: ["tests/features/**/*.feature"],
  require: ["tests/support/**/*.ts", "tests/steps/**/*.ts"],
  publishQuiet: true,
};
