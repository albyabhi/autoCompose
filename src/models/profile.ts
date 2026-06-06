import mongoose, { Schema, Document } from "mongoose";
import type { ProfessionalType } from "@/modules/profile/professional";

export type FormalityLevel = "formal" | "semi-formal" | "casual";
export type PreferredTone = "professional" | "friendly" | "neutral" | "warm" | "direct";

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
    portfolio?: string;
  };
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
      portfolio: { type: String, trim: true },
    },
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

profileSchema.index({ userId: 1 });

export const Profile =
  mongoose.models.Profile ?? mongoose.model<IProfile>("Profile", profileSchema);
