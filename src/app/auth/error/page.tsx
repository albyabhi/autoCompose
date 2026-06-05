import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="auth-page">
      <div className="auth-page__container">
        <div className="auth-card">
          <h1 className="auth-card__title">Sign in failed</h1>
          <p className="auth-card__text">
            The email or password you entered is incorrect. Please check your
            credentials and try again.
          </p>
          <Link
            href="/login"
            className="auth-form__submit auth-form__submit--link"
          >
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
}
