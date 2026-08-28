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
// PURPOSE: The core user account model — stores authentication info, role, and Telegram linking data.
// HOW IT WORKS: Mongoose schema for the User collection. Each document represents one registered account:
//   - Authentication: email (unique, lowercase), passwordHash (for credentials login), provider ("credentials" or "oauth").
//   - Profile basics: name, avatar (URL), role ("user" or "admin").
//   - Onboarding: emailVerified date, onboardingCompleted boolean.
//   - Telegram integration: telegram subdocument with chatId (unique index), username, linkedAt timestamp, enabled flag. Used by the bot to link Telegram chats to accounts.
//   - Telegram login flow: telegramLoginCode (bcrypt hash, select:false for security), telegramLoginCodeExpiresAt (select:false).
//   Indexes: email (unique), role, telegram.chatId (unique partial index — only when chatId exists).
//   Timestamps: createdAt, updatedAt auto-managed by Mongoose.
// FIELDS: name, email, passwordHash, avatar, role, provider, emailVerified, onboardingCompleted, telegram (chatId, username, linkedAt, enabled), telegramLoginCode, telegramLoginCodeExpiresAt, createdAt, updatedAt.
// INTEGRATION: Used by auth.ts (NextAuth credentials), session.ts (requireAuth, hydrateUser), Telegram commands (handleStart, consumeLoginCode), Telegram link service, DAL. The telegramLoginCode is set via the web settings page and consumed when user clicks the deep link in Telegram.
// ============================================================
