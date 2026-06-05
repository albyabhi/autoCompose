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
