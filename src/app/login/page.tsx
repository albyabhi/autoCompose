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
