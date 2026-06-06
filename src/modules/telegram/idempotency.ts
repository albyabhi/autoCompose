import "server-only";
import { connectDB } from "@/lib/db";
import { TelegramUpdate } from "@/models/telegram-update";

export async function isDuplicateUpdate(updateId: number): Promise<boolean> {
  await connectDB();
  try {
    await TelegramUpdate.create({ updateId });
    return false;
  } catch (error) {
    if (error instanceof Error && /duplicate key/i.test(error.message)) {
      return true;
    }
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: number }).code;
      if (code === 11000) return true;
    }
    throw error;
  }
}
