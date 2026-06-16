import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="auth-page">
      <div className="auth-page__container">
        <Link href="/" className="auth-page__logo">
          AutoCompose
        </Link>
        <RegisterForm />
      </div>
    </div>
  );
}

// ============================================================
// FILE: src/app/register/page.tsx
// ============================================================
// PURPOSE: Registration page — displays the account creation form.
// HOW IT WORKS: Renders a centered auth page with the AutoCompose logo/link
//   and the RegisterForm component. The form validates input with Zod,
//   POSTs to /api/auth/register, then auto-signs in via NextAuth signIn().
// INTEGRATION: RegisterForm component, /api/auth/register, NextAuth signIn
// ============================================================
