import mongoose, { Schema, Document } from "mongoose";
import type { ProfessionalType } from "@/modules/profile/professional";

export type FormalityLevel = "formal" | "semi-formal" | "casual";
export type PreferredTone = "professional" | "friendly" | "neutral" | "warm" | "direct";

export interface IContact {
  id: string;
  name: string;
  email: string;
}

export interface IProfile extends Document {
  userId: string;
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
    preferredModel?: string;
  };
  jobApplication: {
    resumeUrl?: string;
    linkedIn?: string;
    github?: string;
    portfolio?: string;
  };
  emailCredentials?: {
    gmailAddress?: string;
    encryptedAppPassword?: string;
    encryptedDek?: string;
    dekVersion?: number;
  };
  contacts?: IContact[];
    resume?: {
      rawText?: string;
      name?: string;
      email?: string;
      phone?: string;
      linkedin?: string;
      github?: string;
      portfolio?: string;
      parsedByModel?: string;
      skills: string[];
    education: {
      degree: string;
      institution?: string;
      year?: string;
    }[];
    experience: {
      company: string;
      role?: string;
      duration?: string;
      description?: string;
    }[];
    projects: {
      name: string;
      description?: string;
      url?: string;
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      unique: true,
      index: true,
    },
    personal: {
      fullName: {
        type: String,
        required: [true, "Full name is required"],
        trim: true,
      },
      phone: { type: String, trim: true },
      location: { type: String, trim: true },
    },
    professional: {
      type: {
        type: String,
        enum: ["student", "working_professional"],
      },
      designation: { type: String, trim: true },
      department: { type: String, trim: true },
      organization: { type: String, trim: true },
      college: { type: String, trim: true },
      degree: { type: String, trim: true },
    },
    preferences: {
      formalityLevel: {
        type: String,
        enum: ["formal", "semi-formal", "casual"],
        default: "semi-formal",
      },
      preferredTone: {
        type: String,
        enum: ["professional", "friendly", "neutral", "warm", "direct"],
        default: "professional",
      },
      defaultSignature: { type: String, trim: true },
      preferredLanguage: { type: String, trim: true, default: "English" },
      preferredModel: { type: String, trim: true },
    },
    jobApplication: {
      resumeUrl: { type: String, trim: true },
      linkedIn: { type: String, trim: true },
      github: { type: String, trim: true },
      portfolio: { type: String, trim: true },
    },
    emailCredentials: {
      gmailAddress: { type: String, trim: true },
      encryptedAppPassword: { type: String },
      encryptedDek: { type: String },
      dekVersion: { type: Number },
    },
    contacts: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
      },
    ],
    resume: {
      rawText: { type: String },
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      linkedin: { type: String },
      github: { type: String },
      portfolio: { type: String },
      parsedByModel: { type: String },
      skills: [{ type: String }],
      education: [
        {
          degree: { type: String },
          institution: { type: String },
          year: { type: String },
        },
      ],
      experience: [
        {
          company: { type: String },
          role: { type: String },
          duration: { type: String },
          description: { type: String },
        },
      ],
      projects: [
        {
          name: { type: String },
          description: { type: String },
          url: { type: String },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

export const Profile =
  mongoose.models.Profile ?? mongoose.model<IProfile>("Profile", profileSchema);

// ============================================================
// FILE: src/models/profile.ts
// ============================================================
// PURPOSE: The user's complete profile — personal info, work history, writing preferences, and encrypted Gmail credentials — all used to personalize AI-generated emails.
// HOW IT WORKS: Mongoose schema for the Profile collection. One profile per user (userId unique index). Six sections:
//   1. personal: fullName (required), phone, location.
//   2. professional: type ("student" | "working_professional"), then role-specific fields — student: college, degree; professional: designation, department, organization.
//   3. preferences: formalityLevel (formal/semi-formal/casual), preferredTone (professional/friendly/neutral/warm/direct), defaultSignature, preferredLanguage, preferredModel (AI model key).
//   4. jobApplication: Links for job hunting — resumeUrl, linkedIn, github, portfolio.
//   5. emailCredentials: Gmail SMTP credentials stored securely — gmailAddress, encryptedAppPassword (v1 legacy or v2 envelope), encryptedDek (v2 only), dekVersion (v2 only). Decrypted by crypto.ts at send time.
//   6. contacts: Array of {id, name, email} for quick recipient selection.
//   7. resume: Parsed from uploaded PDF/DOCX/TXT — rawText, name, email, phone, linkedin, github, portfolio, parsedByModel, skills[], education[], experience[], projects[].
//   The resume data is injected into AI prompts by context-builder.ts based on email category.
// FIELDS: userId (unique), personal, professional, preferences, jobApplication, emailCredentials, contacts, resume, createdAt, updatedAt.
// INTEGRATION: Profile service (CRUD), context builder (AI prompt injection), email dispatch (credential decryption), resume parser (storage), schedule processor, Telegram bot. emailCredentials uses envelope encryption v2 from crypto.ts.
// ============================================================
