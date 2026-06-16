export {};

// ============================================================
// FILE: vitest-shims/server-only.ts
// ============================================================
// PURPOSE: Empty module shim to prevent "server-only" import errors in tests.
// HOW IT WORKS: Provides an empty export for the "server-only" package. When
//   code imports "server-only" (Next.js directive for server-only code), Vitest
//   resolves it here instead of failing. This allows server components to be
//   unit tested in a Node test environment.
// INTEGRATION: Referenced in vitest.config.ts aliases
// ============================================================
