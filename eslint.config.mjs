import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright artifacts (may or may not exist locally; avoid ENOENT scans).
    "test-results/**",
    "playwright-report/**",

    // Local utility scripts (not part of the app runtime).
    // These are often quick Node one-offs and don't follow our TS/Next lint rules.
    "check-*.js",
    "analyze-*.js",
    "fix-*.js",
    "verify-*.js",
    "test-*.js",
    "smoke-*.js",
    "smoke-*.ts",
  ]),

  // Keep lint useful for app code; don't fail builds on "any" in legacy areas.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // Reduce noise from "style" rules; we use lint mainly to catch real problems.
      "prefer-const": "warn",
      "prefer-rest-params": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react/display-name": "warn",
    },
  },

  // Allow CommonJS require() in scripts/tests that are not bundled by Next.
  {
    files: ["*.js", "scripts/**/*.{js,ts}", "tests/**/*.{js,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
]);

export default eslintConfig;
