module.exports = {
  skipFiles: ["mocks/", "periphery/", "interfaces/", "typechain-types/"],
  istanbulReporter: ["json", "text", "lcov"],
  mocha: {
    timeout: 200000,
  },
};
