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
