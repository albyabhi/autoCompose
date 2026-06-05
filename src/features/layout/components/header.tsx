"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useLayoutStore } from "@/features/layout/stores/layout-store";
import { UserButton } from "@/components/auth/user-button";
import Link from "next/link";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useCurrentUser();
  const setMobileSidebarOpen = useLayoutStore((s) => s.setMobileSidebarOpen);

  return (
    <header className="app-header">
      <div className="app-header__left">
        <button
          className="app-header__sidebar-toggle"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Toggle sidebar"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
        <Link href="/dashboard" className="app-header__logo">
          AutoCompose
        </Link>
        {title && <span className="app-header__divider">/</span>}
        {title && <span className="app-header__title">{title}</span>}
      </div>

      <div className="app-header__right">
        {user && <UserButton />}
      </div>
    </header>
  );
}
