import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "user" | "admin";
export type AuthProvider = "credentials" | "oauth";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  avatar?: string;
  role: UserRole;
  provider: AuthProvider;
  emailVerified?: Date;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

export const User =
  mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);
