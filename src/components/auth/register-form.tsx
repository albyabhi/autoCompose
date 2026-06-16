"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { register } from "@/app/actions/auth";

export function RegisterForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(register, undefined);

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard");
    }
  }, [state, router]);

  return (
    <div className="auth-card">
      <h1 className="auth-card__title">Create account</h1>
      <p className="auth-card__text">
        Set up your account to start generating professional emails.
      </p>

      <form action={action} className="auth-form">
        <div className="auth-form__field">
          <label htmlFor="reg-name" className="auth-form__label">
            Name
          </label>
          <input
            id="reg-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Your full name"
            className="auth-form__input"
            disabled={pending}
          />
          {state?.errors?.name && (
            <p className="auth-form__field-error">{state.errors.name[0]}</p>
          )}
        </div>

        <div className="auth-form__field">
          <label htmlFor="reg-email" className="auth-form__label">
            Email
          </label>
          <input
            id="reg-email"
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
          <label htmlFor="reg-password" className="auth-form__label">
            Password
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Create a strong password"
            className="auth-form__input"
            disabled={pending}
          />
          <p className="auth-form__hint">
            At least 8 characters with uppercase, lowercase, number, and special
            character.
          </p>
          {state?.errors?.password && (
            <p className="auth-form__field-error">{state.errors.password[0]}</p>
          )}
        </div>

        {state?.message && !state.success && (
          <p className="auth-form__error">{state.message}</p>
        )}

        <button type="submit" disabled={pending} className="auth-form__submit">
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="auth-form__footer">
        Already have an account?{" "}
        <Link href="/login" className="auth-form__link">
          Sign in
        </Link>
      </p>
    </div>
  );
}

// ============================================================
// FILE: src/components/auth/register-form.tsx
// ============================================================
// PURPOSE: Registration form component with name, email, and password fields.
// HOW IT WORKS: Uses React's useActionState to call the register server action.
//   On success, navigates to /dashboard. Shows field-level validation errors
//   and form-level messages. Password hint explains complexity requirements.
//   Supports pending state for loading UI. Links to /login for existing users.
// PROPS: None (standalone page component)
// INTEGRATION: Register server action, React useActionState, Next.js router
// ============================================================
