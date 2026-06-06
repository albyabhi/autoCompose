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
