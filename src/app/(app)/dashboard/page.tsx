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

// ============================================================
// FILE: src/app/(app)/dashboard/page.tsx
// ============================================================
// PURPOSE: Dashboard page — displays welcome message and navigation cards.
// HOW IT WORKS: Server component that fetches the session and current user via
//   DAL functions (verifySession, getCurrentUser). Renders a welcome greeting
//   with the user's name (or userId fallback) and three navigation cards:
//   Compose Email (/), Session History (/sessions), and Profile Settings (/settings).
// INTEGRATION: DAL (verifySession, getCurrentUser), Next.js Link
// ============================================================
