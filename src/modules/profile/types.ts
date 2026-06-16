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
    formalityLevel?: FormalityLevel;
    preferredTone?: PreferredTone;
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

// ============================================================
// FILE: src/modules/profile/types.ts
// ============================================================
// PURPOSE: TypeScript interfaces for profile data transfer objects.
// HOW IT WORKS: ProfileData is the normalized profile shape with personal,
//   professional, preferences, and jobApplication sections. ProfileContext
//   is the AI-ready version with formatted sections string, character count,
//   signature, formality/tone preferences. ProfileReadiness tracks which
//   profile sections are complete vs missing for a given email category.
// INTEGRATION: Used by profile service, context builder, and frontend hooks
// ============================================================
