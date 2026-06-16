import { z } from "zod";
import { MODEL_IDS_KEYS } from "@/modules/ai/types";
import { normalizeProfessionalForSave, PROFESSIONAL_TYPES } from "./professional";

export const personalSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name cannot exceed 100 characters"),
  phone: z.string().max(30, "Phone cannot exceed 30 characters").optional().or(z.literal("")),
  location: z.string().max(200, "Location cannot exceed 200 characters").optional().or(z.literal("")),
});

const professionalBaseSchema = z.object({
  type: z.enum(PROFESSIONAL_TYPES),
  designation: z.string().max(100).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  organization: z.string().max(200).optional().or(z.literal("")),
  college: z.string().max(200).optional().or(z.literal("")),
  degree: z.string().max(100).optional().or(z.literal("")),
});

export const professionalSchema = professionalBaseSchema
  .superRefine((data, ctx) => {
    if (data.type === "student") {
      if (!data.college?.trim()) {
        ctx.addIssue({ code: "custom", path: ["college"], message: "College is required for students" });
      }
      if (!data.degree?.trim()) {
        ctx.addIssue({ code: "custom", path: ["degree"], message: "Degree is required for students" });
      }
    } else {
      if (!data.designation?.trim()) {
        ctx.addIssue({ code: "custom", path: ["designation"], message: "Designation is required for working professionals" });
      }
      if (!data.organization?.trim()) {
        ctx.addIssue({ code: "custom", path: ["organization"], message: "Organization is required for working professionals" });
      }
    }
  })
  .transform(normalizeProfessionalForSave);

export const preferencesSchema = z.object({
  formalityLevel: z.enum(["formal", "semi-formal", "casual"]).optional(),
  preferredTone: z.enum(["professional", "friendly", "neutral", "warm", "direct"]).optional(),
  defaultSignature: z.string().max(500).optional().or(z.literal("")),
  preferredLanguage: z.string().max(50).optional().or(z.literal("")),
  preferredModel: z
    .string()
    .refine((value) => (MODEL_IDS_KEYS as readonly string[]).includes(value), {
      message: "preferredModel must be one of the registered ModelId values",
    })
    .optional(),
});

export const jobApplicationSchema = z.object({
  resumeUrl: z.string().url("Resume URL must be a valid URL").optional().or(z.literal("")),
  linkedIn: z.string().url("LinkedIn URL must be a valid URL").optional().or(z.literal("")),
  portfolio: z.string().url("Portfolio URL must be a valid URL").optional().or(z.literal("")),
});

export const emailCredentialsSchema = z.union([
  z.object({
    gmailAddress: z.string().email("Gmail address must be a valid email"),
    appPassword: z
      .string()
      .transform((value) => value.replace(/\s+/g, ""))
      .refine(
        (value) => value.length === 16,
        "App password must be 16 characters (Google App Password format)"
      ),
  }),
  z.null(),
]);

export const resumeEducationSchema = z.object({
  degree: z.string(),
  institution: z.string().optional(),
  year: z.string().optional(),
});

export const resumeExperienceSchema = z.object({
  company: z.string(),
  role: z.string().optional(),
  duration: z.string().optional(),
  description: z.string().optional(),
});

export const resumeProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  url: z.string().optional(),
});

export const resumeSchema = z.object({
  rawText: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
  skills: z.array(z.string()),
  education: z.array(resumeEducationSchema),
  experience: z.array(resumeExperienceSchema),
  projects: z.array(resumeProjectSchema),
});

export const profileUpdateSchema = z.object({
  personal: personalSchema.optional(),
  professional: professionalSchema.optional(),
  preferences: preferencesSchema.optional(),
  jobApplication: jobApplicationSchema.optional(),
  emailCredentials: emailCredentialsSchema.optional(),
});

export const profileCreateSchema = z.object({
  personal: personalSchema,
  professional: professionalSchema.optional(),
  preferences: preferencesSchema.optional(),
  jobApplication: jobApplicationSchema.optional(),
});

export type ResumeData = z.infer<typeof resumeSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ProfileCreateInput = z.infer<typeof profileCreateSchema>;

// ============================================================
// FILE: src/modules/profile/validation.ts
// =================================================>
// PURPOSE: Zod schemas for validating profile create/update inputs and resume data.
// HOW IT WORKS: personalSchema validates name (required) and optional phone/location.
//   professionalSchema uses superRefine to enforce type-specific required fields
//   (college+degree for students, designation+organization for professionals) and
//   transforms via normalizeProfessionalForSave. preferencesSchema validates
//   formality, tone, language, and model choice. emailCredentialsSchema validates
//   Gmail address + 16-char app password (with whitespace stripped). resumeSchema
//   validates the full parsed resume structure. profileUpdateSchema and
//   profileCreateSchema compose these into request-level schemas.
// INTEGRATION: Used by profile API routes and service functions
// ============================================================
