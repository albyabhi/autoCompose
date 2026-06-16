"use client";

import { UserButton } from "@/components/auth/user-button";

export function SidebarFooter() {
  return (
    <div className="sidebar__footer">
      <UserButton />
    </div>
  );
}

// ============================================================
// FILE: src/features/layout/components/sidebar-footer.tsx
// ============================================================
// PURPOSE: Footer section of the sidebar containing the user profile button.
// HOW IT WORKS: Wraps the existing UserButton component in a styled container
//   that sits at the bottom of the sidebar using flexbox margin-top: auto.
// PROPS: None (self-contained).
// INTEGRATION: UserButton component.
// ============================================================
