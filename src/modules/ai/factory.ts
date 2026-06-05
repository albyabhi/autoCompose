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
