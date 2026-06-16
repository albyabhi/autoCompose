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
  ]),
]);

export default eslintConfig;

// ============================================================
// FILE: eslint.config.mjs
// ============================================================
// PURPOSE: ESLint flat config for Next.js with TypeScript support.
// HOW IT WORKS: Extends eslint-config-next's core-web-vitals and TypeScript
//   rules. Ignores build output directories (.next, out, build) and the
//   auto-generated next-env.d.ts file. Uses the new ESLint flat config
//   format (defineConfig + globalIgnores).
// INTEGRATION: ESLint, eslint-config-next
// ============================================================
