process.env.AUTH_SECRET ??= "test-auth-secret-32-chars-minimum-12345";
process.env.MONGODB_URI ??= "mongodb://localhost:27017/test";
process.env.NVIDIA_API_KEY ??= "test-nvidia-key";

// ============================================================
// FILE: vitest-shims/setup.ts
// ============================================================
// PURPOSE: Sets default environment variables for all Vitest tests.
// HOW IT WORKS: Uses nullish coalescing assignment (??=) to set fallback values
//   for required environment variables if they're not already defined. Provides
//   test-safe defaults: dummy auth secret, local test MongoDB URI, and fake
//   NVIDIA API key. This prevents tests from failing due to missing config.
// INTEGRATION: Referenced in vitest.config.ts setupFiles
// ============================================================
