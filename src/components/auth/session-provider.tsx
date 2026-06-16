"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { createContext, useContext } from "react";
import type { CurrentUser } from "@/lib/auth/types";

interface AuthContextValue {
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  setCurrentUser: () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  );
}

// ============================================================
// FILE: src/components/auth/session-provider.tsx
// ============================================================
// PURPOSE: Wraps the app with NextAuth SessionProvider and a custom AuthContext.
// HOW IT WORKS: Delegates to NextAuth's SessionProvider for session management.
//   AuthContext provides currentUser state that can be shared across components
//   without prop drilling. useAuthContext() hook accesses the context.
// PROPS: children (React nodes)
// INTEGRATION: NextAuth session, React context
// ============================================================
