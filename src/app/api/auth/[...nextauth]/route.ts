import { handlers } from "@/auth";

export const { GET, POST } = handlers;

// ============================================================
// FILE: src/app/api/auth/[...nextauth]/route.ts
// ============================================================
// PURPOSE: Next.js API route handler for NextAuth.js authentication endpoints.
// HOW IT WORKS: Re-exports the NextAuth handlers (GET/POST) for the catch-all
//   auth route. Handles session management, sign-in, sign-out, CSRF protection,
//   and callback URLs for the credentials provider configured in auth.ts.
// INTEGRATION: NextAuth.js, auth.ts configuration
// ============================================================
