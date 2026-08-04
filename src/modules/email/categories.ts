export const EMAIL_CATEGORIES = [
  "job_application",
  "leave_request",
  "sick_leave",
  "resignation",
  "complaint",
  "meeting_request",
  "custom",
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];
export type ProfileSection = "personal" | "professional" | "preferences" | "jobApplication" | "resume" | "contactInfo";

export interface CategoryPolicy {
  value: EmailCategory;
  label: string;
  profileSections: readonly ProfileSection[];
  promptGuidance: readonly string[];
  aiInstruction: string;
}

export const CATEGORY_POLICIES: Record<EmailCategory, CategoryPolicy> = {
  job_application: {
    value: "job_application",
    label: "Job Application",
    profileSections: ["personal", "professional", "jobApplication", "resume", "preferences", "contactInfo"],
    promptGuidance: ["target role", "company", "job requirements", "recipient", "relevant strengths"],
    aiInstruction: "Write a tailored application that connects the user's most relevant evidence to the target role. Do not invent qualifications.",
  },
  leave_request: {
    value: "leave_request",
    label: "Leave Request",
    profileSections: ["personal", "professional", "preferences", "contactInfo"],
    promptGuidance: ["recipient", "leave dates", "duration", "handoff or availability"],
    aiInstruction: "Clearly request the leave dates, briefly state the reason if provided, and cover handoff or availability without oversharing.",
  },
  sick_leave: {
    value: "sick_leave",
    label: "Sick Leave",
    profileSections: ["personal", "professional", "preferences", "contactInfo"],
    promptGuidance: ["recipient", "leave dates", "duration", "handoff or availability"],
    aiInstruction: "Write a concise sick-leave notice. Never invent, request, or expose medical details.",
  },
  resignation: {
    value: "resignation",
    label: "Resignation",
    profileSections: ["personal", "professional", "preferences", "contactInfo"],
    promptGuidance: ["recipient", "final working date", "notice period", "handoff"],
    aiInstruction: "State the resignation and final working date clearly, remain appreciative, and mention transition support when provided.",
  },
  complaint: {
    value: "complaint",
    label: "Complaint",
    profileSections: ["personal", "preferences", "contactInfo"],
    promptGuidance: ["incident", "date", "impact", "evidence", "requested resolution"],
    aiInstruction: "Present facts neutrally, explain impact, and request a specific reasonable resolution. Do not add accusations or unsupported facts.",
  },
  meeting_request: {
    value: "meeting_request",
    label: "Meeting Request",
    profileSections: ["personal", "professional", "preferences", "contactInfo"],
    promptGuidance: ["purpose", "attendees", "proposed times", "duration", "agenda"],
    aiInstruction: "Make the purpose, expected attendees, timing options, duration, and agenda easy to scan.",
  },
  custom: {
    value: "custom",
    label: "Custom",
    profileSections: ["personal", "preferences", "contactInfo"],
    promptGuidance: ["recipient", "objective", "important facts", "desired tone"],
    aiInstruction: "Follow the user's objective and facts closely while producing a clear professional email.",
  },
};

export const CATEGORY_OPTIONS = EMAIL_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_POLICIES[value].label,
}));

export function isEmailCategory(value: string): value is EmailCategory {
  return EMAIL_CATEGORIES.includes(value as EmailCategory);
}

export function resolveGenerationCategory(
  requestedCategory: EmailCategory,
  sessionCategory?: EmailCategory
): EmailCategory {
  return sessionCategory ?? requestedCategory;
}

// ============================================================
// FILE: src/modules/email/categories.ts
// ============================================================
// PURPOSE: Defines the 7 email categories and their AI prompt policies.
// HOW IT WORKS: EMAIL_CATEGORIES is the canonical list of supported types
//   (job_application, leave_request, sick_leave, resignation, complaint,
//   meeting_request, custom). CATEGORY_POLICIES maps each category to its
//   display label, which profile sections to inject into prompts, guidance
//   strings for the UI, and a specific AI instruction that shapes the
//   generated email. resolveGenerationCategory() merges requested and
//   session categories, preferring the session's category.
// INTEGRATION: Used by AI provider (prompt building), email service,
//   frontend model selector, and session model validation
// ============================================================
