import { z } from "zod";

export const personalSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name cannot exceed 100 characters"),
  phone: z.string().max(30, "Phone cannot exceed 30 characters").optional().or(z.literal("")),
  location: z.string().max(200, "Location cannot exceed 200 characters").optional().or(z.literal("")),
});

export const professionalSchema = z.object({
  designation: z.string().max(100).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  organization: z.string().max(200).optional().or(z.literal("")),
  college: z.string().max(200).optional().or(z.literal("")),
  degree: z.string().max(100).optional().or(z.literal("")),
});

export const preferencesSchema = z.object({
  formalityLevel: z.enum(["formal", "semi-formal", "casual"]),
  preferredTone: z.enum(["professional", "friendly", "neutral", "warm", "direct"]),
  defaultSignature: z.string().max(500).optional().or(z.literal("")),
  preferredLanguage: z.string().max(50).optional().or(z.literal("")),
});

export const jobApplicationSchema = z.object({
  resumeUrl: z.string().url("Resume URL must be a valid URL").optional().or(z.literal("")),
  linkedIn: z.string().url("LinkedIn URL must be a valid URL").optional().or(z.literal("")),
  portfolio: z.string().url("Portfolio URL must be a valid URL").optional().or(z.literal("")),
});

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
