import mongoose, { Schema, Document } from "mongoose";

export interface ITelegramUpdate extends Document {
  updateId: number;
  receivedAt: Date;
}

const telegramUpdateSchema = new Schema<ITelegramUpdate>(
  {
    updateId: {
      type: Number,
      required: true,
      unique: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

telegramUpdateSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 60 * 10 });

export const TelegramUpdate =
  mongoose.models.TelegramUpdate ??
  mongoose.model<ITelegramUpdate>("TelegramUpdate", telegramUpdateSchema);

// ============================================================
// FILE: src/models/telegram-update.ts
// ============================================================
// PURPOSE: Mongoose schema for idempotent Telegram webhook update tracking.
// HOW IT WORKS: Stores each Telegram updateId to prevent duplicate processing.
//   The 10-minute TTL index auto-cleans old records. Before processing an
//   update, the idempotency module checks if this updateId already exists;
//   if so, the update is skipped. This prevents duplicate emails or commands
//   when Telegram retries webhook delivery.
// FIELDS: updateId (unique), receivedAt
// INTEGRATION: Used by Telegram idempotency module and webhook handler
// ============================================================
