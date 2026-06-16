"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { signIn } from "@/auth";
import { logger } from "@/lib/logger";

const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email cannot exceed 255 characters")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export type RegisterState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function register(
  _prev: RegisterState | undefined,
  formData: FormData
): Promise<RegisterState> {
  const validated = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "Validation failed",
    };
  }

  const { name, email, password } = validated.data;

  try {
    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return {
        errors: { email: ["An account with this email already exists"] },
        message: "Email already registered",
      };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      passwordHash,
      provider: "credentials",
      emailVerified: new Date(),
      onboardingCompleted: false,
    });

    logger.info("User registered", { email, name });

    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return { success: true, message: "Account created successfully" };
  } catch (error) {
    logger.error("Registration failed", {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

// ============================================================
// FILE: src/app/actions/auth.ts
// ============================================================
// PURPOSE: Server action for user registration from the registration form.
// HOW IT WORKS: Validates form data against registerSchema (name, email, password
//   with complexity requirements). Checks for duplicate emails, hashes the password
//   with bcrypt (12 rounds), creates the User, then auto-signs in the new user
//   via signIn("credentials"). Returns validation errors or success state for
//   form handling. Uses "use server" directive for Next.js server actions.
// INTEGRATION: User model, bcryptjs, NextAuth signIn, Zod validation
// ============================================================
