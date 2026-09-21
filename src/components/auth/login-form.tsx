"use client";

import { signIn } from "next-auth/react";
import { useActionState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { AuthLoadingScreen } from "./auth-loading-screen";
import { useGuestStore } from "@/features/guest/stores/guest-store";

async function loginAction(
  _prev: {
    errors?: Record<string, string[]>;
    message?: string;
    success?: boolean;
    callbackUrl?: string;
  } | null,
  formData: FormData
) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  const errors: Record<string, string[]> = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ["Enter a valid email address"];
  }

  if (!password) {
    errors.password = ["Password is required"];
  } else if (password.length < 8) {
    errors.password = ["Password must be at least 8 characters"];
  }

  if (Object.keys(errors).length > 0) {
    return { errors, message: "Please fix the errors above" };
  }

  try {
    const callbackUrl = formData.get("callbackUrl") as string;
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: callbackUrl || "/dashboard",
    });

    if (result?.error) {
      return {
        errors: { password: ["Invalid email or password"] },
        message: "Sign in failed",
      };
    }

    return { success: true, callbackUrl: result?.url || "/dashboard" };
  } catch {
    return { message: "An unexpected error occurred. Please try again." };
  }
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [state, action, pending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const enterGuest = useGuestStore((s) => s.enterGuest);

  function handleContinueAsGuest() {
    enterGuest();
    router.push("/");
  }

  if (state?.success) {
    return (
      <AuthLoadingScreen
        variant="login"
        onComplete={() => router.push(state?.callbackUrl || "/dashboard")}
      />
    );
  }

  return (
    <div className="auth-card">
      <h1 className="auth-card__title">Sign in</h1>
      <p className="auth-card__text">
        Enter your credentials to access your account.
      </p>

      <form action={action} className="auth-form">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div className="auth-form__field">
          <label htmlFor="login-email" className="auth-form__label">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="auth-form__input"
            disabled={pending}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {state?.errors?.email && (
            <p className="auth-form__field-error">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="auth-form__field">
          <label htmlFor="login-password" className="auth-form__label">
            Password
          </label>
          <div className="auth-form__input-wrapper">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              className="auth-form__input"
              disabled={pending}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="auth-form__toggle"
              onClick={() => setShowPassword((v) => !v)}
              disabled={pending}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {state?.errors?.password && (
            <p className="auth-form__field-error">{state.errors.password[0]}</p>
          )}
        </div>

        {state?.message && !state.success && (
          <p className="auth-form__error">{state.message}</p>
        )}

        <button type="submit" disabled={pending} className="auth-form__submit">
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="auth-form__divider" aria-hidden="true">
        <span>or</span>
      </div>

      <button
        type="button"
        onClick={handleContinueAsGuest}
        className="auth-form__submit auth-form__submit--secondary"
      >
        Continue without login
      </button>
      <p className="auth-form__hint">Try 5 free mails in single compose — no account needed.</p>

      <p className="auth-form__footer">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="auth-form__link">
          Create one
        </Link>
      </p>
    </div>
  );
}

// ============================================================
// FILE: src/components/auth/login-form.tsx
// ============================================================
// PURPOSE: The sign-in page form — email/password validation, "Show password" toggle, and seamless redirect after login.
// HOW IT WORKS: Page-level component using React 19's useActionState for form handling:
//   - State: email, password, showPassword, pending (submitting).
//   - loginAction(formData): Validates email format (regex) and password length (min 8). Calls NextAuth signIn("credentials", {email, password, redirect: false, callbackUrl}). On error: returns field errors. On success: returns {success: true, callbackUrl}.
//   - On success: renders AuthLoadingScreen (animated) then redirects to callbackUrl.
//   - UI: Email field (type=email), Password field with Show/Hide toggle, submit button with pending state, field-level and form-level error messages, "Create account" link to /register.
//   - Hidden callbackUrl field preserves redirect destination from URL params.
//   - "Continue without login" enters client-only guest trial (5 free single-compose
//     mails via guest-store) and routes to / — no session is created.
// INTEGRATION: NextAuth signIn(), React useActionState, useSearchParams, useRouter, AuthLoadingScreen component. Used by /login page (src/app/login/page.tsx).
// ============================================================
