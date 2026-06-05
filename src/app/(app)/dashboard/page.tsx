import { getCurrentUser, verifySession } from "@/lib/dal";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await verifySession();
  const user = await getCurrentUser();

  return (
    <div className="dashboard-content">
      <h1 className="dashboard-content__title">
        Welcome, {user?.name ?? session.userId}
      </h1>
      <p className="dashboard-content__subtitle">
        AI-powered professional email composition
      </p>

      <div className="dashboard-cards">
        <Link href="/" className="dashboard-card">
          <h2 className="dashboard-card__title">Compose Email</h2>
          <p className="dashboard-card__text">
            Generate professional emails with AI assistance
          </p>
        </Link>
        <Link href="/sessions" className="dashboard-card">
          <h2 className="dashboard-card__title">Session History</h2>
          <p className="dashboard-card__text">
            Browse and continue your previous email generation sessions
          </p>
        </Link>
        <Link href="/settings" className="dashboard-card">
          <h2 className="dashboard-card__title">Profile Settings</h2>
          <p className="dashboard-card__text">
            Manage your personal info, preferences, and job application details
          </p>
        </Link>
      </div>
    </div>
  );
}
