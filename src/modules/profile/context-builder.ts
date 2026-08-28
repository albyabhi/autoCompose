import type { FormalityLevel, PreferredTone } from "@/models/profile";
import { CATEGORY_POLICIES, type EmailCategory, type ProfileSection } from "@/modules/email/categories";
import type { ProfileContext, ProfileReadiness } from "@/modules/ai/types";
import {
  getActiveProfessionalEntries,
  inferProfessionalType,
  isProfessionalComplete,
  type ProfessionalData,
} from "./professional";

export const PROFILE_CONTEXT_BUDGET = 3600;
const RESUME_ITEM_LIMITS = { skills: 10, experience: 4, education: 3, projects: 3 } as const;

export interface ProfileSource {
  personal?: { fullName?: string; phone?: string; location?: string };
  professional?: ProfessionalData;
  preferences?: {
    formalityLevel?: FormalityLevel;
    preferredTone?: PreferredTone;
    defaultSignature?: string;
    preferredLanguage?: string;
    preferredModel?: string;
  };
  jobApplication?: { resumeUrl?: string; linkedIn?: string; github?: string; portfolio?: string };
  emailCredentials?: { gmailAddress?: string; encryptedAppPassword?: string };
  contacts?: { id: string; name: string; email: string }[];
  resume?: {
    rawText?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    skills?: string[];
    education?: { degree: string; institution?: string; year?: string }[];
    experience?: { company: string; role?: string; duration?: string; description?: string }[];
    projects?: { name: string; description?: string; url?: string }[];
  };
}

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

export function getCompletedProfileSections(profile: ProfileSource | null): ProfileSection[] {
  if (!profile) return [];
  const completed: ProfileSection[] = [];
  if (hasValue(profile.personal?.fullName)) completed.push("personal");
  if (isProfessionalComplete(profile.professional)) completed.push("professional");
  if (profile.preferences?.formalityLevel && profile.preferences?.preferredTone) completed.push("preferences");
  if (Object.values(profile.jobApplication ?? {}).some(hasValue)) completed.push("jobApplication");
  if (
    (profile.resume?.skills?.length ?? 0) > 0 ||
    (profile.resume?.experience?.length ?? 0) > 0 ||
    (profile.resume?.education?.length ?? 0) > 0 ||
    (profile.resume?.projects?.length ?? 0) > 0
  ) completed.push("resume");
  return completed;
}

export function buildCategoryReadiness(
  profile: ProfileSource | null,
  category: EmailCategory
): ProfileReadiness {
  const selectedSections = [...CATEGORY_POLICIES[category].profileSections];
  const completed = new Set(getCompletedProfileSections(profile));
  return {
    category,
    selectedSections,
    missingSections: selectedSections.filter((section) => !completed.has(section)),
  };
}

export function buildAllCategoryReadiness(
  profile: ProfileSource | null
): Record<EmailCategory, ProfileReadiness> {
  return Object.fromEntries(
    Object.keys(CATEGORY_POLICIES).map((category) => [
      category,
      buildCategoryReadiness(profile, category as EmailCategory),
    ])
  ) as Record<EmailCategory, ProfileReadiness>;
}

function words(value: string): Set<string> {
  return new Set(
    value.toLowerCase().match(/[a-z0-9+#.]{3,}/g)?.filter((word) => !["with", "from", "that", "this", "email", "write"].includes(word)) ?? []
  );
}

function rankByPrompt<T>(items: T[], prompt: string, stringify: (item: T) => string): T[] {
  const promptWords = words(prompt);
  return items
    .map((item, index) => ({
      item,
      index,
      score: [...words(stringify(item))].filter((word) => promptWords.has(word)).length,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}

function addLine(lines: string[], line: string, budget: number): void {
  const used = lines.join("\n").length;
  if (used >= budget) return;
  const remaining = budget - used - (lines.length ? 1 : 0);
  if (remaining <= 0) return;
  lines.push(line.slice(0, remaining));
}

function addSection(lines: string[], title: string, entries: string[], budget: number): void {
  if (entries.length === 0) return;
  addLine(lines, `${title}:`, budget);
  for (const entry of entries) addLine(lines, `- ${entry}`, budget);
}

export function buildProfileContext(
  profile: ProfileSource | null,
  category: EmailCategory,
  prompt: string,
  budget = PROFILE_CONTEXT_BUDGET,
  tone?: FormalityLevel
): ProfileContext | null {
  if (!profile) return null;

  const policy = CATEGORY_POLICIES[category];
  const selectedSections = policy.profileSections;
  const lines: string[] = [];

  if (selectedSections.includes("personal") && profile.personal?.fullName) {
    const personal = [profile.personal.fullName];
    if (profile.personal.location) personal.push(profile.personal.location);
    addSection(lines, "PERSONAL", personal, budget);
  }

  if (selectedSections.includes("contactInfo")) {
    const contact: string[] = [];
    const phone = profile.personal?.phone || profile.resume?.phone;
    if (phone) contact.push(`Phone: ${phone}`);
    const email = profile.emailCredentials?.gmailAddress || profile.resume?.email;
    if (email) contact.push(`Email: ${email}`);
    addSection(lines, "CONTACT INFO", contact, budget);
  }

  if (selectedSections.includes("professional")) {
    const active = getActiveProfessionalEntries(profile.professional);
    if (active) addSection(lines, active.title, active.entries, budget);
  }

  if (selectedSections.includes("jobApplication")) {
    const links = [
      profile.jobApplication?.resumeUrl && `Resume: ${profile.jobApplication.resumeUrl}`,
      profile.jobApplication?.linkedIn && `LinkedIn: ${profile.jobApplication.linkedIn}`,
      profile.jobApplication?.github && `GitHub: ${profile.jobApplication.github}`,
      profile.jobApplication?.portfolio && `Portfolio: ${profile.jobApplication.portfolio}`,
    ].filter(Boolean) as string[];
    addSection(lines, "APPLICATION LINKS", links, budget);
  }

  if (selectedSections.includes("resume") && profile.resume) {
    const resume = profile.resume;
    const skills = rankByPrompt(resume.skills ?? [], prompt, String).slice(0, RESUME_ITEM_LIMITS.skills);
    addSection(lines, "RELEVANT SKILLS", skills, budget);

    const experiences = rankByPrompt(resume.experience ?? [], prompt, JSON.stringify)
      .slice(0, RESUME_ITEM_LIMITS.experience)
      .map((item) => [item.role, item.company, item.duration, item.description].filter(Boolean).join(" | "));
    addSection(lines, "RELEVANT EXPERIENCE", experiences, budget);

    const education = rankByPrompt(resume.education ?? [], prompt, JSON.stringify)
      .slice(0, RESUME_ITEM_LIMITS.education)
      .map((item) => [item.degree, item.institution, item.year].filter(Boolean).join(" | "));
    addSection(lines, "RELEVANT EDUCATION", education, budget);

    const projects = rankByPrompt(resume.projects ?? [], prompt, JSON.stringify)
      .slice(0, RESUME_ITEM_LIMITS.projects)
      .map((item) => [item.name, item.description, item.url].filter(Boolean).join(" | "));
    addSection(lines, "RELEVANT PROJECTS", projects, budget);
  }

  const effectiveFormality = tone ?? profile.preferences?.formalityLevel ?? "semi-formal";

  if (selectedSections.includes("preferences")) {
    addSection(lines, "WRITING PREFERENCES", [
      `Formality: ${effectiveFormality}`,
      `Tone: ${profile.preferences?.preferredTone ?? "professional"}`,
      `Language: ${profile.preferences?.preferredLanguage || "English"}`,
    ], budget);
  }

  const signature = profile.preferences?.defaultSignature ?? (
    profile.personal?.fullName ? `Best regards,\n${profile.personal.fullName}` : ""
  );
  const readiness = buildCategoryReadiness(profile, category);

  return {
    sections: lines,
    selectedSections: selectedSections.filter((section) => !readiness.missingSections.includes(section)),
    characterCount: lines.join("\n").length,
    signature,
    formality: effectiveFormality,
    tone: profile.preferences?.preferredTone ?? "professional",
    language: profile.preferences?.preferredLanguage || undefined,
  };
}

export function sanitizeProfile(profile: ProfileSource | null): ProfileSource | null {
  if (!profile) return null;
  const safeResume = profile.resume ? { ...profile.resume, rawText: undefined } : undefined;
  const safeEmailCredentials = {
    gmailAddress: profile.emailCredentials?.gmailAddress ?? null,
    emailConfigured: !!profile.emailCredentials?.encryptedAppPassword,
  };
  return JSON.parse(JSON.stringify({
    personal: profile.personal ?? {},
    professional: profile.professional
      ? { ...profile.professional, type: inferProfessionalType(profile.professional) }
      : {},
    preferences: profile.preferences ?? {},
    jobApplication: profile.jobApplication ?? {},
    emailCredentials: safeEmailCredentials,
    contacts: profile.contacts ?? [],
    ...(safeResume ? { resume: safeResume } : {}),
  }));
}

// ============================================================
// FILE: src/modules/profile/context-builder.ts
// ============================================================
// PURPOSE: Builds a concise, relevant summary of the user's profile to feed to the AI when generating emails — only the parts that matter for the specific email type.
// HOW IT WORKS: The AI doesn't need the user's entire life story for every email. This module selects and formats only the relevant sections based on the email category (from categories.ts):
//   - buildProfileContext(): Main function. Takes profile, category, user's prompt, and character budget (default 3600 chars). For each section the category requires:
//     * personal: Name + location
//     * contactInfo: Phone + email (from resume or credentials)
//     * professional: Current role title + active experience entries (from professional.ts)
//     * jobApplication: Resume/LinkedIn/GitHub/Portfolio links
//     * resume: Skills/experience/education/projects — RANKED by keyword overlap with the user's prompt so the most relevant items appear first. Limits: 10 skills, 4 experiences, 3 education, 3 projects.
//     * preferences: Formality level, tone, language
//     Adds a signature line. Returns ProfileContext with sections array, character count, signature, and writing preferences.
//   - getCompletedProfileSections(): Checks which profile sections have actual data (used by UI to show completion status).
//   - buildCategoryReadiness(): For a category, shows which required sections are filled vs missing.
//   - sanitizeProfile(): Removes sensitive data (raw resume text, encrypted passwords) for safe API responses to the frontend.
// INTEGRATION: Uses CATEGORY_POLICIES from email/categories.ts; professional.ts for active entries; AI types from src/modules/ai/types.ts. Called by: email service (src/modules/email/service.ts), schedule processor (src/modules/schedule/service.ts), Telegram AI bridge (src/modules/telegram/ai-bridge.ts), profile API (src/app/api/profile/route.ts).
// ============================================================
