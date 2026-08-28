import { AIProvider } from "./types";
import { NvidiaNIMProvider } from "./providers/nvidia";

const providers = new Map<string, AIProvider>();

function getProvider(): AIProvider {
  if (!providers.has("nvidia")) {
    providers.set("nvidia", new NvidiaNIMProvider());
  }
  return providers.get("nvidia")!;
}

export function getAIProvider(): AIProvider {
  return getProvider();
}

// ============================================================
// FILE: src/modules/ai/factory.ts
// ============================================================
// PURPOSE: Provides the single AI provider instance used throughout the app — currently NVIDIA NIM, but swappable via the factory pattern.
// HOW IT WORKS: Uses a Map to cache provider instances. On first call to getAIProvider(), it creates a NvidiaNIMProvider (which connects to NVIDIA's API using the OpenAI SDK) and stores it. Subsequent calls return the cached instance. This singleton pattern means only one HTTP connection pool to the AI API exists. The factory pattern lets us swap providers (e.g., to a local model or different API) by changing only this file — all callers (email service, Telegram, schedules) use getAIProvider() and don't care about the implementation.
// INTEGRATION: Creates NvidiaNIMProvider (src/modules/ai/providers/nvidia.ts); called by email service (src/modules/email/service.ts), Telegram AI bridge (src/modules/telegram/ai-bridge.ts), schedule processor (src/modules/schedule/service.ts), bulk service (src/modules/bulk/service.ts), and any API route that needs AI.
// ============================================================
