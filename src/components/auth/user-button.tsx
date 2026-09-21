"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useGuestStore } from "@/features/guest/stores/guest-store";

export function UserButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const isGuest = useGuestStore((s) => s.isGuest);
  const count = useGuestStore((s) => s.count);

  if (status === "loading") return null;

  if (!session?.user) {
    if (!isGuest) return null;
    return (
      <div className="user-button__wrapper">
        <div className="user-button__guest">
          <span className="user-button__avatar user-button__avatar--guest">G</span>
          <span className="user-button__name">Guest ({count}/5 used)</span>
        </div>
        <Link href="/login" className="user-button__login">
          Login
        </Link>
      </div>
    );
  }

  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : session.user.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <div className="user-button__wrapper">
      <button
        onClick={() => setOpen(!open)}
        className="user-button__trigger"
        aria-label="User menu"
      >
        <span className="user-button__avatar">{initials}</span>
        <span className="user-button__name">{session.user.name ?? session.user.email}</span>
      </button>

      {open && (
        <>
          <div className="user-button__backdrop" onClick={() => setOpen(false)} />
          <div className="user-button__menu">
            <div className="user-button__menu-header">
              <p className="user-button__menu-name">
                {session.user.name ?? "User"}
              </p>
              <p className="user-button__menu-email">{session.user.email}</p>
            </div>
            <div className="user-button__menu-divider" />
            <Link
              href="/settings"
              className="user-button__menu-item"
              onClick={() => setOpen(false)}
            >
              Settings
            </Link>
            <div className="user-button__menu-divider" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="user-button__menu-item user-button__menu-item--danger"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// FILE: src/components/auth/user-button.tsx
// ============================================================
// PURPOSE: User avatar/menu button for the sidebar footer, plus the guest Login CTA.
// HOW IT WORKS: Displays the user's initials avatar and dropdown (Settings/Sign
//   out) when authed. When logged out but in guest trial, renders a Guest usage
//   label plus a prominent Login button instead of returning null. Shows nothing
//   for plain logged-out visitors (AuthGuard redirects them anyway).
// PROPS: None (reads session + guest store)
// INTEGRATION: NextAuth session, signOut, Next.js Link, guest-store
// ============================================================
