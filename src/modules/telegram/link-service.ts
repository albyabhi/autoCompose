import "server-only";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { TelegramState } from "@/models/telegram-state";
import { TelegramUpdate } from "@/models/telegram-update";
import { recordAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { getConfig } from "@/config";
import bcrypt from "bcryptjs";

const CODE_TTL_MS = 10 * 60 * 1000;
const HASH_ROUNDS = 10;

export interface LoginCodeResult {
  code: string;
  expiresAt: Date;
  deepLink: string;
}

export async function generateLoginCode(userId: string, ip?: string): Promise<LoginCodeResult> {
  checkRateLimit(`telegram:login-code:gen:${userId}`, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  });

  await connectDB();
  const now = Date.now();
  const user = await User.findById(userId)
    .select("telegram telegramLoginCode telegramLoginCodeExpiresAt")
    .lean();
  if (!user) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  if (user.telegram?.enabled && user.telegram?.chatId) {
    throw new AppError("ALREADY_LINKED", "Telegram is already linked to this account", 409);
  }

  if (user.telegramLoginCodeExpiresAt && user.telegramLoginCodeExpiresAt.getTime() > now) {
    throw new AppError(
      "CODE_ACTIVE",
      "An active code already exists. Revoke it first or wait for it to expire.",
      409
    );
  }

  const plaintext = generateBase36Code();
  const hash = await bcrypt.hash(plaintext, HASH_ROUNDS);
  const expiresAt = new Date(now + CODE_TTL_MS);

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        telegramLoginCode: hash,
        telegramLoginCodeExpiresAt: expiresAt,
      },
    }
  );

  void recordAudit({
    action: "telegram.login_code_generated",
    userId,
    ip,
    metadata: { expiresAt: expiresAt.toISOString() },
  });

  const cfg = getConfig();
  const deepLink = cfg.telegram.botUsername
    ? `https://t.me/${cfg.telegram.botUsername.replace(/^@/, "")}?start=${plaintext}`
    : "";

  return { code: plaintext, expiresAt, deepLink };
}

export async function revokeLoginCode(userId: string, ip?: string): Promise<void> {
  await connectDB();
  await User.updateOne(
    { _id: userId },
    { $unset: { telegramLoginCode: 1, telegramLoginCodeExpiresAt: 1 } }
  );
  void recordAudit({
    action: "telegram.login_code_generated",
    userId,
    ip,
    metadata: { revoked: true },
  });
}

export async function unlinkTelegram(userId: string, ip?: string): Promise<void> {
  await connectDB();
  const user = await User.findById(userId).select("telegram").lean();
  if (!user) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }
  const chatId = user.telegram?.chatId;
  await User.updateOne(
    { _id: userId },
    {
      $unset: {
        "telegram.chatId": 1,
        "telegram.username": 1,
        "telegram.linkedAt": 1,
      },
      $set: { "telegram.enabled": false },
    }
  );

  if (chatId) {
    await TelegramState.deleteMany({ chatId });
    await TelegramUpdate.deleteMany({});
  }

  void recordAudit({
    action: "telegram.unlinked",
    userId,
    ip,
    metadata: { chatId: chatId ?? null },
  });
}

export async function getTelegramStatus(userId: string) {
  await connectDB();
  const user = await User.findById(userId).select("telegram").lean();
  if (!user) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }
  return {
    linked: !!user.telegram?.enabled && !!user.telegram?.chatId,
    username: user.telegram?.username ?? null,
    linkedAt: user.telegram?.linkedAt ?? null,
    enabled: !!user.telegram?.enabled,
  };
}

function generateBase36Code(length = 8): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export { CODE_TTL_MS };
