import { AIProvider, ModelId } from "./types";
import { NvidiaNIMProvider } from "./providers/nvidia";
import { AIProviderError } from "@/lib/errors";

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
// PURPOSE: Singleton factory that provides the AI provider instance.
// HOW IT WORKS: Maintains a Map of provider instances. getProvider() lazily
//   creates the NvidiaNIMProvider on first call and caches it. getAIProvider()
//   is the public API that returns the active provider. The factory pattern
//   allows switching providers without changing consumer code.
// INTEGRATION: Called by email service, Telegram AI bridge, and API routes
// ============================================================
