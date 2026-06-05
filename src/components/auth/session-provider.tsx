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
