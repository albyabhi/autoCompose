export interface CurrentUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  onboardingCompleted: boolean;
  profileCompleted: boolean;
  avatar?: string;
}

export interface AuthenticatedContext {
  user: CurrentUser;
  userId: string;
}

// ============================================================
// FILE: src/lib/auth/types.ts
// ============================================================
// PURPOSE: Defines TypeScript interfaces for authenticated user data.
// HOW IT WORKS: CurrentUser holds the hydrated user profile (name, email,
//   role, onboarding status, avatar). AuthenticatedContext wraps it with
//   a convenience userId field. These types are used across the auth
//   layer and API routes for consistent user data access.
// ============================================================
