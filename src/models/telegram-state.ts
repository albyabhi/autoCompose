import mongoose, { Schema, Document } from "mongoose";

export const TELEGRAM_STEPS = [
  "idle",
  "selecting_category",
  "awaiting_prompt",
  "browsing_sessions",
  "awaiting_recipient",
  "awaiting_subject",
  "awaiting_send_confirm",
] as const;

export type TelegramStep = (typeof TELEGRAM_STEPS)[number];

export interface ITelegramState extends Document {
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
  createdAt: Date;
}

const telegramStateSchema = new Schema<ITelegramState>(
  {
    chatId: {
      type: String,
      required: [true, "Chat ID is required"],
      unique: true,
      trim: true,
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    step: {
      type: String,
      enum: TELEGRAM_STEPS,
      default: "idle",
    },
    category: { type: String },
    draftId: { type: String },
    draftSnapshot: { type: String },
    pendingSendTo: { type: String },
    pendingSubject: { type: String },
    pageOffset: { type: Number, default: 0 },
    pendingInput: { type: String },
    version: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

telegramStateSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });
telegramStateSchema.index({ userId: 1, updatedAt: -1 });

export const TelegramState =
  mongoose.models.TelegramState ??
  mongoose.model<ITelegramState>("TelegramState", telegramStateSchema);

// ============================================================
// FILE: src/models/telegram-state.ts
// ============================================================
// PURPOSE: Mongoose schema for tracking multi-step Telegram bot conversation state.
// HOW IT WORKS: Maintains a state machine per chatId with steps: idle ->
//   selecting_category -> awaiting_prompt -> browsing_sessions -> awaiting_recipient
//   -> awaiting_subject -> awaiting_send_confirm. Stores draft data, pending
//   inputs, and pagination offset. Has a 24-hour TTL index on updatedAt to
//   auto-expire stale conversations. The version field prevents race conditions.
// FIELDS: chatId (unique), userId, step, category, draftId, draftSnapshot,
//   pendingSendTo, pendingSubject, pageOffset, pendingInput, version
// INTEGRATION: Used by Telegram state machine, compose flow, and send flow
// ============================================================
