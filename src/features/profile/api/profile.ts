import { api } from "@/lib/api-client";

export interface ProfileData {
  personal: {
    fullName: string;
    phone: string;
    location: string;
  };
  professional: {
    designation: string;
    department: string;
    organization: string;
    college: string;
    degree: string;
  };
  preferences: {
    formalityLevel: string;
    preferredTone: string;
    defaultSignature: string;
    preferredLanguage: string;
  };
  jobApplication: {
    resumeUrl: string;
    linkedIn: string;
    portfolio: string;
  };
}

export async function fetchProfile(): Promise<{ profile: ProfileData | null }> {
  return api.get<{ profile: ProfileData | null }>("/api/profile");
}

export async function updateProfile(
  section: string,
  data: Record<string, unknown>
): Promise<{ profile: ProfileData }> {
  return api.patch<{ profile: ProfileData }>("/api/profile", {
    [section]: data,
  });
}
