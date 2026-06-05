"use client";

import { signIn } from "next-auth/react";
import { useActionState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

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

  useEffect(() => {
    if (state?.success && state.callbackUrl) {
      router.push(state.callbackUrl);
    }
  }, [state, router]);

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
          />
          {state?.errors?.email && (
            <p className="auth-form__field-error">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="auth-form__field">
          <label htmlFor="login-password" className="auth-form__label">
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            className="auth-form__input"
            disabled={pending}
          />
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

      <p className="auth-form__footer">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="auth-form__link">
          Create one
        </Link>
      </p>
    </div>
  );
}
