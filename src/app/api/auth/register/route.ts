import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { success, failure } from "@/utils/api-response";
import { logger } from "@/lib/logger";
import { isAppError } from "@/lib/errors";

const registerSchema = z
  .object({
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
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return failure({
        name: "ValidationError",
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        statusCode: 400,
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, email, password } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return failure({
        name: "AppError",
        code: "DUPLICATE_EMAIL",
        message: "An account with this email already exists",
        statusCode: 409,
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      provider: "credentials",
      emailVerified: new Date(),
      onboardingCompleted: false,
    });

    logger.info("User registered via API", { email, userId: user._id.toString() });

    return success(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
      201
    );
  } catch (error) {
    if (isAppError(error as Error)) {
      logger.warn("Register API error", {
        code: (error as { code: string }).code,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/auth/register/route.ts
// ============================================================
// PURPOSE: API endpoint for new user registration (POST /api/auth/register).
// HOW IT WORKS: Validates the request body against a strict schema (name,
//   email, password with uppercase/lowercase/number/special char requirements).
//   Checks for duplicate emails, hashes the password with bcrypt (12 rounds),
//   creates the User document, and returns the new user's ID/name/email.
//   Returns 409 for duplicate emails.
// INTEGRATION: User model, bcryptjs, Zod validation
// ============================================================
