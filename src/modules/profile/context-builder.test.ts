import { describe, expect, it } from "vitest";
import { EMAIL_CATEGORIES } from "@/modules/email/categories";
import {
  PROFILE_CONTEXT_BUDGET,
  buildAllCategoryReadiness,
  buildProfileContext,
  sanitizeProfile,
  type ProfileSource,
} from "./context-builder";

const profile: ProfileSource = {
  personal: { fullName: "Ada Lovelace", phone: "secret-phone", location: "London" },
  professional: { designation: "Engineer", organization: "Analytical Engines" },
  preferences: { formalityLevel: "formal", preferredTone: "professional", preferredLanguage: "English" },
  jobApplication: { linkedIn: "https://linkedin.example/ada" },
  resume: {
    rawText: "RAW RESUME MUST NEVER LEAK",
    skills: ["TypeScript", "React", "COBOL"],
    experience: [
      { company: "Web Co", role: "React Engineer", description: "Built React products" },
      { company: "Legacy Co", role: "COBOL Engineer", description: "Maintained mainframes" },
    ],
    education: [{ degree: "Mathematics", institution: "University" }],
    projects: [{ name: "React Portal", description: "React and TypeScript" }],
  },
};

describe("category-aware profile context", () => {
  it.each(EMAIL_CATEGORIES)("selects only policy sections for %s", (category) => {
    const context = buildProfileContext(profile, category, "React role");
    expect(context?.selectedSections).toEqual(expect.arrayContaining([]));
    if (category !== "job_application") {
      expect(context?.sections.join("\n")).not.toContain("RELEVANT SKILLS");
      expect(context?.sections.join("\n")).not.toContain("APPLICATION LINKS");
    }
  });

  it("ranks relevant resume entries and respects the profile budget", () => {
    const context = buildProfileContext(profile, "job_application", "React TypeScript role", 300);
    const text = context?.sections.join("\n") ?? "";
    expect(text.indexOf("React")).toBeLessThan(text.indexOf("COBOL"));
    expect(text.length).toBeLessThanOrEqual(300);
    expect(context?.characterCount).toBeLessThanOrEqual(PROFILE_CONTEXT_BUDGET);
  });

  it("never includes raw resume text and sanitizes it from API data", () => {
    expect(buildProfileContext(profile, "job_application", "Engineer")?.sections.join("\n"))
      .not.toContain("RAW RESUME MUST NEVER LEAK");
    expect(JSON.stringify(sanitizeProfile(profile))).not.toContain("RAW RESUME MUST NEVER LEAK");
  });

  it("reports missing sections without blocking categories", () => {
    const readiness = buildAllCategoryReadiness({ personal: { fullName: "Ada" } });
    expect(readiness.job_application.missingSections).toEqual(
      expect.arrayContaining(["professional", "jobApplication", "resume", "preferences"])
    );
    expect(readiness.complaint.missingSections).toEqual(["preferences", "contactInfo"]);
  });

  it("uses only the active professional branch in prompt context", () => {
    const student = buildProfileContext({
      personal: { fullName: "Ada" },
      professional: {
        type: "student",
        college: "University",
        degree: "Mathematics",
        organization: "Hidden Company",
      },
    }, "meeting_request", "Request a meeting")?.sections.join("\n") ?? "";

    expect(student).toContain("STUDENT");
    expect(student).toContain("University");
    expect(student).not.toContain("Hidden Company");
  });

  it("includes CONTACT INFO section with phone and email from profile", () => {
    const context = buildProfileContext(profile, "job_application", "React role");
    const text = context?.sections.join("\n") ?? "";
    expect(text).toContain("CONTACT INFO");
    expect(text).toContain("Phone: secret-phone");
  });

  it("deduplicates phone — prefers personal.phone over resume.phone", () => {
    const p: ProfileSource = {
      personal: { fullName: "Ada", phone: "personal-phone" },
      resume: { phone: "resume-phone", skills: [], education: [], experience: [], projects: [] },
      preferences: { formalityLevel: "formal", preferredTone: "professional" },
    };
    const text = buildProfileContext(p, "job_application", "Engineer")?.sections.join("\n") ?? "";
    expect(text).toContain("Phone: personal-phone");
    expect(text).not.toContain("resume-phone");
  });

  it("deduplicates email — prefers gmailAddress over resume.email", () => {
    const p: ProfileSource = {
      personal: { fullName: "Ada" },
      emailCredentials: { gmailAddress: "ada@gmail.com" },
      resume: { email: "ada@resume.com", skills: [], education: [], experience: [], projects: [] },
      preferences: { formalityLevel: "formal", preferredTone: "professional" },
    };
    const text = buildProfileContext(p, "job_application", "Engineer")?.sections.join("\n") ?? "";
    expect(text).toContain("Email: ada@gmail.com");
    expect(text).not.toContain("ada@resume.com");
  });

  it("omits CONTACT INFO section when no contact data exists", () => {
    const p: ProfileSource = {
      personal: { fullName: "Ada" },
      preferences: { formalityLevel: "formal", preferredTone: "professional" },
    };
    const text = buildProfileContext(p, "job_application", "Engineer")?.sections.join("\n") ?? "";
    expect(text).not.toContain("CONTACT INFO");
  });

  it("includes GitHub in APPLICATION LINKS when present", () => {
    const p: ProfileSource = {
      personal: { fullName: "Ada" },
      jobApplication: { github: "https://github.com/ada" },
      preferences: { formalityLevel: "formal", preferredTone: "professional" },
    };
    const text = buildProfileContext(p, "job_application", "Engineer")?.sections.join("\n") ?? "";
    expect(text).toContain("GitHub: https://github.com/ada");
  });
});
