"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export function UserButton() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  if (!session?.user) return null;

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
