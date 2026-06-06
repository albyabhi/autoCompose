import type { FormalityLevel, PreferredTone } from "@/models/profile";
import type { EmailCategory, ProfileSection } from "@/modules/email/categories";
import type { ProfessionalType } from "./professional";

export interface ProfileData {
  personal: {
    fullName: string;
    phone?: string;
    location?: string;
  };
  professional: {
    type?: ProfessionalType;
    designation?: string;
    department?: string;
    organization?: string;
    college?: string;
    degree?: string;
  };
  preferences: {
    formalityLevel: FormalityLevel;
    preferredTone: PreferredTone;
    defaultSignature?: string;
    preferredLanguage?: string;
  };
  jobApplication: {
    resumeUrl?: string;
    linkedIn?: string;
    portfolio?: string;
  };
}

export interface ProfileContext {
  signature: string;
  formality: FormalityLevel;
  tone: PreferredTone;
  language?: string;
  sections: string[];
  selectedSections: ProfileSection[];
  characterCount: number;
}

export interface ProfileReadiness {
  category: EmailCategory;
  selectedSections: ProfileSection[];
  missingSections: ProfileSection[];
}
