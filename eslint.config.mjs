import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/coverage/**",
    "**/artifacts/**",
    "**/artifacts-forge/**",
    "**/cache/**",
    "**/cache-forge/**",
    "**/typechain-types/**",
    "contracts/lib/**",
    "contracts/abi/src/generated/**",
    "apps/web/next-env.d.ts",
    "**/playwright-report/**",
    "**/test-results/**",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["apps/web/**/*.{js,jsx,mjs,ts,tsx}"],
    extends: [...nextVitals, ...nextTs],
    settings: {
      next: { rootDir: "apps/web" },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["contracts/tests/**/*.ts", "contracts/scripts/**/*.ts"],
    rules: {
      // Hardhat signers/factories are not fully typed; chai `expect` is an expression.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
]);
