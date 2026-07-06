import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "src/**/?(*.)+(spec|test).[jt]s?(x)"],
  // The Next.js build copies package.json into .next/standalone, which collides
  // with the app's package.json under jest-haste-map. Ignore build output.
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/**/layout.tsx",
  ],
};

export default createJestConfig(config);
