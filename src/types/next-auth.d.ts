import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    onboardingCompleted?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    provider: string;
  }
}

// ============================================================
// FILE: src/types/next-auth.d.ts
// ============================================================
// PURPOSE: TypeScript type augmentations for NextAuth.js Session and JWT.
// HOW IT WORKS: Extends the default NextAuth Session interface to include
//   id (user ID) and role (user/admin) on session.user. Extends the JWT
//   interface to include id, role, and provider for token-level access.
//   These augmentations ensure type safety when accessing session data
//   throughout the application.
// INTEGRATION: NextAuth.js, used by auth callbacks and client-side session access
// ============================================================
