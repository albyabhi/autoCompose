import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./vitest-shims/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest-shims/setup.ts"],
  },
});

// ============================================================
// FILE: vitest.config.ts
// ============================================================
// PURPOSE: Vitest test runner configuration with path aliases and shims.
// HOW IT WORKS: Sets up the "@" path alias to point to "./src" for import
//   resolution. Maps "server-only" to a shim file that provides an empty
//   module (since server-only imports are only valid in server context).
//   Uses Node environment and runs setup.ts for test env defaults.
// INTEGRATION: Vitest, vitest-shims/
// ============================================================
