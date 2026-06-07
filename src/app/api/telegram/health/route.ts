import { NextResponse } from "next/server";
import { getConfig } from "@/config";
import { connectDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = getConfig();
  const result: {
    enabled: boolean;
    botTokenSet: boolean;
    webhookSecretSet: boolean;
    botUsername: string | null;
    botInfo: unknown;
    mongoReachable: boolean;
    mongoError: string | null;
  } = {
    enabled: cfg.telegram.enabled,
    botTokenSet: !!cfg.telegram.botToken,
    webhookSecretSet: !!cfg.telegram.webhookSecret,
    botUsername: cfg.telegram.botUsername,
    botInfo: null,
    mongoReachable: false,
    mongoError: null,
  };

  try {
    const { Bot } = await import("grammy");
    if (cfg.telegram.botToken) {
      const bot = new Bot(cfg.telegram.botToken);
      const info = await bot.api.getMe();
      result.botInfo = {
        id: info.id,
        username: info.username,
        first_name: info.first_name,
        can_join_groups: info.can_join_groups,
      };
    }
  } catch (error) {
    result.botInfo = {
      error: error instanceof Error ? error.message : "unknown",
    };
  }

  try {
    await connectDB();
    result.mongoReachable = true;
  } catch (error) {
    result.mongoError = error instanceof Error ? error.message : "unknown";
  }

  return NextResponse.json(result);
}
