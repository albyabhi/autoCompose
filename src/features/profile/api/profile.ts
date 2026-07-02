import { api } from "@/lib/api-client";
import type { EmailCategory, ProfileSection } from "@/modules/email/categories";
import type { ProfessionalType } from "@/modules/profile/professional";

export interface ProfileData {
  personal: {
    fullName: string;
    phone: string;
    location: string;
  };
  professional: {
    type?: ProfessionalType;
    designation: string;
    department: string;
    organization: string;
    college: string;
    degree: string;
  };
  preferences: {
    formalityLevel?: string;
    preferredTone?: string;
    defaultSignature?: string;
    preferredLanguage?: string;
    preferredModel?: string;
  };
  jobApplication: {
    resumeUrl: string;
    linkedIn: string;
    github: string;
    portfolio: string;
  };
  emailCredentials: {
    gmailAddress: string | null;
    emailConfigured: boolean;
  };
  contacts: { id: string; name: string; email: string }[];
}

export interface ProfileReadiness {
  category: EmailCategory;
  selectedSections: ProfileSection[];
  missingSections: ProfileSection[];
}

export type ProfileResponse = {
  profile: ProfileData | null;
  readiness: Record<EmailCategory, ProfileReadiness>;
};

export async function fetchProfile(): Promise<ProfileResponse> {
  return api.get<ProfileResponse>("/api/profile");
}

export async function updateProfile(
  section: string,
  data: Record<string, unknown>
): Promise<ProfileResponse> {
  return api.patch<ProfileResponse>("/api/profile", {
    [section]: data,
  });
}

export async function setEmailCredentials(payload: {
  gmailAddress: string;
  appPassword: string;
}): Promise<ProfileResponse> {
  return api.patch<ProfileResponse>("/api/profile", {
    emailCredentials: payload,
  });
}

export async function removeEmailCredentials(): Promise<ProfileResponse> {
  return api.patch<ProfileResponse>("/api/profile", {
    emailCredentials: null,
  });
}

export async function updateContacts(
  contacts: { id: string; name: string; email: string }[]
): Promise<ProfileResponse> {
  return api.patch<ProfileResponse>("/api/profile", { contacts });
}

// ============================================================
// FILE: src/features/profile/api/profile.ts
// ============================================================
// PURPOSE: API client functions for reading and updating the user profile, including email credentials.
// HOW IT WORKS: Uses the shared api client to GET /api/profile for the full profile and readiness data, PATCH /api/profile to update any section, and PATCH again to set or remove email credentials. All functions return typed ProfileResponse objects.
// INTEGRATION: @/lib/api-client, EmailCategory/ProfileSection types, ProfessionalType type.
// ============================================================
