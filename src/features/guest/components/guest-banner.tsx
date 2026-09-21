"use client";

import Link from "next/link";
import { GUEST_LIMIT } from "@/lib/guest";

interface GuestBannerProps {
  count: number;
  remaining: number;
  limitReached: boolean;
}

export function GuestBanner({ count, remaining, limitReached }: GuestBannerProps) {
  if (limitReached) {
    return (
      <div className="guest-banner guest-banner--exceeded" role="alert">
        <div>
          <strong>Limit exceeded — please login.</strong>{" "}
          <span>
            You have used all {GUEST_LIMIT} free mails. Sign in to keep composing.
          </span>
        </div>
        <div className="guest-banner__actions">
          <Link href="/login" className="guest-banner__login">
            Login
          </Link>
          <Link href="/register" className="guest-banner__link">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-banner" role="status">
      <div>
        <strong>Trying AutoCompose as a guest.</strong>{" "}
        <span>
          {remaining} of {GUEST_LIMIT} free mails left{count > 0 ? ` (${count} used)` : ""}.
          Login for unlimited compose, send, batch & schedules.
        </span>
      </div>
      <Link href="/login" className="guest-banner__link">
        Login
      </Link>
    </div>
  );
}

// ============================================================
// FILE: src/features/guest/components/guest-banner.tsx
// ============================================================
// PURPOSE: Guest-trial usage meter and limit-exceeded call-to-action.
// HOW IT WORKS: Shows remaining count while trial is active; swaps to a
//   blocking alert with Login/Create-account actions once 5 mails are used.
// PROPS: count, remaining, limitReached.
// INTEGRATION: Rendered by GenerateForm for guests; styles in globals.css.
// ============================================================
