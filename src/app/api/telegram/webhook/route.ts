import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/config";
import { ensureBotMiddleware, isTelegramEnabled } from "@/modules/telegram/bot";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "crypto";

function constantTimeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function verifySecret(request: NextRequest): boolean {
  const cfg = getConfig();
  if (!cfg.telegram.webhookSecret) return false;
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  if (!provided) return false;
  return constantTimeEquals(provided, cfg.telegram.webhookSecret);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!isTelegramEnabled()) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_DISABLED" }, { status: 503 });
  }
  if (!verifySecret(request)) {
    await recordAudit({
      action: "telegram.webhook_rejected",
      ip,
      metadata: { reason: "bad_or_missing_secret" },
    });
    logger.warn("Telegram webhook rejected: secret mismatch", { ip });
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_JSON" }, { status: 400 });
  }

  try {
    const bot = ensureBotMiddleware();
    await bot.handleUpdate(update as Parameters<typeof bot.handleUpdate>[0]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Telegram webhook error", error instanceof Error ? { message: error.message } : error);
    await recordAudit({
      action: "api.error",
      ip,
      metadata: { source: "telegram.webhook", reason: error instanceof Error ? error.message : "unknown" },
    });
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
