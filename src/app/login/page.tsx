import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-page__container">
        <Link href="/" className="auth-page__logo">
          AutoCompose
        </Link>
        <Suspense fallback={<div className="auth-card__title">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

// ============================================================
// FILE: src/app/login/page.tsx
// ============================================================
// PURPOSE: Login page — displays the authentication form.
// HOW IT WORKS: Renders a centered auth page with the AutoCompose logo/link
//   and the LoginForm component wrapped in Suspense. The form handles email +
//   password login via NextAuth signIn(). On success, redirects to the home page.
// INTEGRATION: LoginForm component, NextAuth signIn
// ============================================================
