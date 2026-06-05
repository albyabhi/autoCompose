import type { FormalityLevel, PreferredTone } from "@/models/profile";

export interface ProfileData {
  personal: {
    fullName: string;
    phone?: string;
    location?: string;
  };
  professional: {
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
  summary: string;
  signature: string;
  formality: FormalityLevel;
  tone: PreferredTone;
  hasJobInfo: boolean;
  language?: string;
  sections: string[];
}
