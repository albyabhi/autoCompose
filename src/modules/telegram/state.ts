import "server-only";
import { connectDB } from "@/lib/db";
import { TelegramState, ITelegramState, TelegramStep } from "@/models/telegram-state";

export interface TelegramStateSnapshot {
  chatId: string;
  userId: string;
  step: TelegramStep;
  category?: string;
  draftId?: string;
  draftSnapshot?: string;
  pendingSendTo?: string;
  pendingSubject?: string;
  pageOffset: number;
  pendingInput?: string;
  version: number;
  updatedAt: Date;
}

const IDLE_SNAPSHOT: Omit<TelegramStateSnapshot, "chatId" | "userId"> = {
  step: "idle",
  pageOffset: 0,
  version: 0,
  updatedAt: new Date(0),
};

function toSnapshot(doc: ITelegramState | null, chatId: string, userId: string): TelegramStateSnapshot {
  if (!doc) {
    return { chatId, userId, ...IDLE_SNAPSHOT };
  }
  return {
    chatId: doc.chatId,
    userId: doc.userId,
    step: doc.step,
    category: doc.category,
    draftId: doc.draftId,
    draftSnapshot: doc.draftSnapshot,
    pendingSendTo: doc.pendingSendTo,
    pendingSubject: doc.pendingSubject,
    pageOffset: doc.pageOffset,
    pendingInput: doc.pendingInput,
    version: doc.version,
    updatedAt: doc.updatedAt,
  };
}

export async function loadState(chatId: string): Promise<TelegramStateSnapshot | null> {
  await connectDB();
  const doc = await TelegramState.findOne({ chatId }).lean<ITelegramState | null>();
  if (!doc) return null;
  return toSnapshot(doc, chatId, (doc as ITelegramState).userId);
}

export async function loadStateForUser(chatId: string, userId: string): Promise<TelegramStateSnapshot> {
  const loaded = await loadState(chatId);
  if (loaded) return loaded;
  return { chatId, userId, ...IDLE_SNAPSHOT };
}

export interface SaveStatePatch {
  step?: TelegramStep;
  category?: string | null;
  draftId?: string | null;
  draftSnapshot?: string | null;
  pendingSendTo?: string | null;
  pendingSubject?: string | null;
  pageOffset?: number;
  pendingInput?: string | null;
}

export async function saveState(
  chatId: string,
  userId: string,
  patch: SaveStatePatch,
  expectedVersion?: number
): Promise<TelegramStateSnapshot> {
  await connectDB();
  const set: Record<string, unknown> = { userId };
  const unset: Record<string, 1> = {};

  if (patch.step !== undefined) set.step = patch.step;
  if (patch.category !== undefined) {
    if (patch.category === null) unset.category = 1; else set.category = patch.category;
  }
  if (patch.draftId !== undefined) {
    if (patch.draftId === null) unset.draftId = 1; else set.draftId = patch.draftId;
  }
  if (patch.draftSnapshot !== undefined) {
    if (patch.draftSnapshot === null) unset.draftSnapshot = 1; else set.draftSnapshot = patch.draftSnapshot;
  }
  if (patch.pendingSendTo !== undefined) {
    if (patch.pendingSendTo === null) unset.pendingSendTo = 1; else set.pendingSendTo = patch.pendingSendTo;
  }
  if (patch.pendingSubject !== undefined) {
    if (patch.pendingSubject === null) unset.pendingSubject = 1; else set.pendingSubject = patch.pendingSubject;
  }
  if (patch.pageOffset !== undefined) set.pageOffset = patch.pageOffset;
  if (patch.pendingInput !== undefined) {
    if (patch.pendingInput === null) unset.pendingInput = 1; else set.pendingInput = patch.pendingInput;
  }

  const filter = expectedVersion === undefined
    ? { chatId }
    : { chatId, version: expectedVersion };

  const update: Record<string, unknown> = {
    $set: { ...set, chatId },
    $inc: { version: 1 },
  };
  if (Object.keys(unset).length > 0) update.$unset = unset;

  const updated = await TelegramState.findOneAndUpdate(
    filter,
    update,
    { new: true, upsert: expectedVersion === undefined, setDefaultsOnInsert: true }
  ).lean<ITelegramState | null>();

  if (!updated) {
    throw new Error("STATE_CONFLICT");
  }

  return toSnapshot(updated, chatId, userId);
}

export async function clearState(chatId: string): Promise<void> {
  await connectDB();
  await TelegramState.deleteOne({ chatId });
}

export async function clearStatesForChatIds(chatIds: string[]): Promise<number> {
  if (chatIds.length === 0) return 0;
  await connectDB();
  const result = await TelegramState.deleteMany({ chatId: { $in: chatIds } });
  return result.deletedCount ?? 0;
}

// ============================================================
// FILE: src/modules/telegram/state.ts
// ============================================================
// PURPOSE: Manages multi-step conversation state for Telegram bot interactions.
// HOW IT WORKS: Provides loadState/saveState/clearState for the state machine.
//   loadStateForUser() returns the current state or an idle default. saveState()
//   applies a partial patch to the state document with optimistic concurrency
//   control via version number - if expectedVersion is provided and doesn't match,
//   it throws STATE_CONFLICT. Fields are set/unset dynamically based on the patch.
//   States auto-expire after 24 hours via TTL index. clearState() deletes the
//   state document entirely.
// INTEGRATION: TelegramState model, used by webhook, compose flow, and send flow
// ============================================================
