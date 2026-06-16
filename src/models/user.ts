import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "user" | "admin";
export type AuthProvider = "credentials" | "oauth";

export interface ITelegramLink {
  chatId?: string;
  username?: string;
  linkedAt?: Date;
  enabled: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  avatar?: string;
  role: UserRole;
  provider: AuthProvider;
  emailVerified?: Date;
  onboardingCompleted: boolean;
  telegram: ITelegramLink;
  telegramLoginCode?: string;
  telegramLoginCodeExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const telegramSubSchema = new Schema<ITelegramLink>(
  {
    chatId: { type: String, trim: true },
    username: { type: String, trim: true },
    linkedAt: { type: Date },
    enabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    provider: {
      type: String,
      enum: ["credentials", "oauth"],
      default: "credentials",
    },
    emailVerified: {
      type: Date,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    telegram: {
      type: telegramSubSchema,
      default: () => ({ enabled: false }),
    },
    telegramLoginCode: {
      type: String,
      select: false,
    },
    telegramLoginCodeExpiresAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index(
  { "telegram.chatId": 1 },
  { unique: true, partialFilterExpression: { "telegram.chatId": { $type: "string" } } }
);

export const User =
  mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);

// ============================================================
// FILE: src/models/user.ts
// ============================================================
// PURPOSE: Mongoose schema and model for user accounts.
// HOW IT WORKS: Defines the User document with fields for auth (email,
//   passwordHash, provider), profile (name, avatar), role (user/admin),
//   onboarding status, and Telegram linking (chatId, username, login codes).
//   Indexes on email, role, and telegram.chatId optimize common queries.
//   Telegram login codes use select:false to hide from default queries.
// FIELDS: name, email, passwordHash, avatar, role, provider, onboardingCompleted,
//   telegram (chatId, username, linkedAt, enabled), telegramLoginCode
// INTEGRATION: Used by auth.ts, session.ts, DAL, and Telegram link service
// ============================================================
