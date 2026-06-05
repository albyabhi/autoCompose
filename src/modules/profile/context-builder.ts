import type { FormalityLevel, PreferredTone } from "@/models/profile";
import type { ProfileContext } from "./types";

interface ProfileSource {
  personal?: {
    fullName?: string;
    phone?: string;
    location?: string;
  };
  professional?: {
    designation?: string;
    department?: string;
    organization?: string;
    college?: string;
    degree?: string;
  };
  preferences?: {
    formalityLevel?: FormalityLevel;
    preferredTone?: PreferredTone;
    defaultSignature?: string;
    preferredLanguage?: string;
  };
  jobApplication?: {
    resumeUrl?: string;
    linkedIn?: string;
    portfolio?: string;
  };
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

export function buildProfileContext(profile: ProfileSource | null): ProfileContext | null {
  if (!profile?.personal?.fullName) return null;

  const sections: string[] = [];
  const summaryParts: string[] = [];

  summaryParts.push(profile.personal.fullName);
  if (profile.professional?.designation) summaryParts.push(profile.professional.designation);
  if (profile.professional?.organization) summaryParts.push(`at ${profile.professional.organization}`);
  if (profile.personal?.location) summaryParts.push(`based in ${profile.personal.location}`);

  sections.push(`Name: ${profile.personal.fullName}`);
  if (profile.personal?.phone) sections.push(`Phone: ${profile.personal.phone}`);
  if (profile.personal?.location) sections.push(`Location: ${profile.personal.location}`);

  const hasPro = profile.professional && Object.values(profile.professional).some(Boolean);
  if (hasPro) {
    sections.push("");
    sections.push("PROFESSIONAL:");
    if (profile.professional?.designation) sections.push(`  Designation: ${profile.professional.designation}`);
    if (profile.professional?.department) sections.push(`  Department: ${profile.professional.department}`);
    if (profile.professional?.organization) sections.push(`  Organization: ${profile.professional.organization}`);
    if (profile.professional?.college) sections.push(`  College: ${profile.professional.college}`);
    if (profile.professional?.degree) sections.push(`  Degree: ${profile.professional.degree}`);
  }

  sections.push("");
  sections.push("WRITING PREFERENCES:");
  sections.push(`  Formality: ${profile.preferences?.formalityLevel ?? "semi-formal"}`);
  sections.push(`  Tone: ${profile.preferences?.preferredTone ?? "professional"}`);
  if (profile.preferences?.preferredLanguage) {
    sections.push(`  Language: ${profile.preferences.preferredLanguage}`);
  }
  if (profile.preferences?.defaultSignature) {
    sections.push(`  Default Signature: ${profile.preferences.defaultSignature}`);
  }

  const hasJob = profile.jobApplication && Object.values(profile.jobApplication).some(Boolean);
  if (hasJob) {
    sections.push("");
    sections.push("JOB APPLICATION CONTEXT:");
    if (profile.jobApplication?.resumeUrl) sections.push(`  Resume: ${profile.jobApplication.resumeUrl}`);
    if (profile.jobApplication?.linkedIn) sections.push(`  LinkedIn: ${profile.jobApplication.linkedIn}`);
    if (profile.jobApplication?.portfolio) sections.push(`  Portfolio: ${profile.jobApplication.portfolio}`);
  }

  const signature =
    profile.preferences?.defaultSignature ??
    `Best regards,\n${profile.personal.fullName}`;

  const resume = profile.resume;
  if (resume) {
    sections.push("");
    sections.push("RESUME DATA:");
    if (resume.email) sections.push(`  Email: ${resume.email}`);
    if (resume.phone) sections.push(`  Phone: ${resume.phone}`);
    if (resume.linkedin) sections.push(`  LinkedIn: ${resume.linkedin}`);
    if (resume.github) sections.push(`  GitHub: ${resume.github}`);
    if (resume.portfolio) sections.push(`  Portfolio: ${resume.portfolio}`);
    if (resume.skills && resume.skills.length > 0) {
      sections.push(`  Skills: ${resume.skills.join(", ")}`);
    }
    if (resume.education && resume.education.length > 0) {
      sections.push("  Education:");
      for (const edu of resume.education) {
        const parts = [edu.degree];
        if (edu.institution) parts.push(`- ${edu.institution}`);
        if (edu.year) parts.push(`(${edu.year})`);
        sections.push(`    ${parts.join(" ")}`);
      }
    }
    if (resume.experience && resume.experience.length > 0) {
      sections.push("  Experience:");
      for (const exp of resume.experience) {
        const parts = [exp.company];
        if (exp.role) parts.push(`- ${exp.role}`);
        if (exp.duration) parts.push(`(${exp.duration})`);
        sections.push(`    ${parts.join(" ")}`);
      }
    }
    if (resume.projects && resume.projects.length > 0) {
      sections.push("  Projects:");
      for (const proj of resume.projects) {
        const parts = [proj.name];
        if (proj.description) parts.push(`- ${proj.description}`);
        if (proj.url) parts.push(`(${proj.url})`);
        sections.push(`    ${parts.join(" ")}`);
      }
    }
  }

  const hasJobInfo = !!(profile.jobApplication?.resumeUrl || profile.jobApplication?.linkedIn || profile.jobApplication?.portfolio);

  return {
    summary: summaryParts.join(", "),
    signature,
    formality: profile.preferences?.formalityLevel ?? "semi-formal",
    tone: profile.preferences?.preferredTone ?? "professional",
    hasJobInfo,
    language: profile.preferences?.preferredLanguage || undefined,
    sections,
  };
}
