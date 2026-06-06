import { z } from "zod";
import { getAIProvider } from "@/modules/ai/factory";
import { getProfile, upsertProfile } from "@/modules/profile/service";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import type { ResumeData } from "@/modules/profile/validation";

function e(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { message: error.message, name: error.name, stack: error.stack?.slice(0, 200) };
  }
  return { value: String(error) };
}

const ResumeSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
  skills: z.array(z.string()),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string().optional(),
    year: z.string().optional(),
  })),
  experience: z.array(z.object({
    company: z.string(),
    role: z.string().optional(),
    duration: z.string().optional(),
    description: z.string().optional(),
  })),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    url: z.string().optional(),
  })),
});

export type ParsedResume = z.infer<typeof ResumeSchema>;

// ─── Step 1: Regex extraction (no AI) ────────────────────────────────

interface SimpleFields {
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

function extractSimpleFields(rawText: string): SimpleFields {
  const email = rawText.match(/[\w.-]+@[\w.-]+\.\w+/i)?.[0] ?? "";
  const phone = rawText.match(/(\+?\d[\d\s\-().]{7,})/)?.[0] ?? "";
  const linkedin = (rawText.match(/linkedin\.com\/in\/[\w-]+/i)?.[0] ?? "").replace(/^https?:\/\//i, "");
  const github = (rawText.match(/github\.com\/[\w-]+/i)?.[0] ?? "").replace(/^https?:\/\//i, "");
  const portfolio = extractPortfolio(rawText);
  return { email, phone, linkedin, github, portfolio };
}

function extractPortfolio(rawText: string): string {
  const urls = rawText.match(/https?:\/\/[^\s]+/g) ?? [];
  return urls.find(
    (u) => !u.includes("linkedin") && !u.includes("github")
  ) ?? "";
}



// ─── Shared AI call helper ────────────────────────────────────────────

async function attemptExtract<T>(
  rawText: string,
  systemPrompt: string,
  schema: z.ZodSchema<T>,
  category: string,
  maxTokens: number,
): Promise<T | null> {
  const provider = getAIProvider();

  for (const instruction of [undefined, "Return ONLY valid JSON. No markdown. No explanation."] as const) {
    try {
      const response = await provider.complete({
        prompt: instruction ? `${instruction}\n\n${rawText.slice(0, 6000)}` : rawText.slice(0, 6000),
        category,
        config: { modelId: "deepseek", temperature: 0, maxTokens },
        systemPrompt,
        responseFormat: { type: "json_object" },
      });

      const content = response.content.trim();
      const firstBrace = content.indexOf("{");
      const lastBrace = content.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) continue;

      const parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1));
      return schema.parse(parsed);
    } catch (err) {
      logger.warn(`${category} extract attempt failed`, e(err));
    }
  }

  return null;
}

// ─── Timing helper ────────────────────────────────────────────────────

async function timedExtract<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    logger.info(`${label} extraction duration`, { ms: Math.round(performance.now() - t0) });
  }
}

// ─── Step 3: Single-shot AI prompt & schema ───────────────────────────

const COMPREHENSIVE_RESUME_PROMPT = `
You are an expert resume parser. Extract the following information from the resume text provided.

Return ONLY valid JSON with exactly this schema. Do not add any markdown formatting or explanations.
{
  "name": "",
  "skills": [""],
  "education": [
    {
      "degree": "",
      "institution": "",
      "year": ""
    }
  ],
  "experience": [
    {
      "company": "",
      "role": "",
      "duration": "",
      "description": ""
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "url": ""
    }
  ]
}

Rules:
- Missing values must be "".
- Limit skills to maximum 15 items.
- Limit education to maximum 5 items.
- Limit experience to maximum 10 items.
- Limit projects to maximum 10 items.
- Keep all descriptions concise (under 100 characters).
- Output ONLY JSON.
`;

const CombinedSchema = z.object({
  name: z.string().optional().default(""),
  skills: z.array(z.string()).optional().default([]),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string().optional(),
    year: z.string().optional(),
  })).optional().default([]),
  experience: z.array(z.object({
    company: z.string(),
    role: z.string().optional(),
    duration: z.string().optional(),
    description: z.string().optional(),
  })).optional().default([]),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    url: z.string().optional(),
  })).optional().default([]),
});

// ─── Orchestrator ─────────────────────────────────────────────────────

export async function parseResumeWithAI(
  rawText: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ParsedResume> {
  logger.info("Parsing resume with single-shot extraction", { textLength: rawText.length });

  // 1. Fast Regex Fallbacks
  const simple = extractSimpleFields(rawText);

  // 2. Single AI Call
  onProgress?.(40, "Analyzing data with AI...");
  const aiResult = await timedExtract("Full Resume Extract", () =>
    attemptExtract(
      rawText,
      COMPREHENSIVE_RESUME_PROMPT,
      CombinedSchema,
      "resume_full_extract",
      1500
    )
  );

  // 3. Merge AI result with regex fallbacks and enforce limits safely
  onProgress?.(80, "Structuring extracted data...");
  const merged = {
    name: aiResult?.name || "",
    email: simple.email,
    phone: simple.phone,
    linkedin: simple.linkedin,
    github: simple.github,
    portfolio: simple.portfolio,
    skills: (aiResult?.skills || []).slice(0, 15),
    education: (aiResult?.education || []).slice(0, 5),
    experience: (aiResult?.experience || []).slice(0, 10),
    projects: (aiResult?.projects || []).slice(0, 10),
  };

  const result = ResumeSchema.parse(merged);
  
  logger.info("Resume parsing complete", {
    hasName: !!result.name,
    skillCount: result.skills.length,
    eduCount: result.education.length,
    expCount: result.experience.length,
    projCount: result.projects.length,
    hasEmail: !!result.email,
    hasPhone: !!result.phone,
    hasLinkedIn: !!result.linkedin,
    hasGithub: !!result.github,
    hasPortfolio: !!result.portfolio,
  });

  return result;
}

function extractFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = extractFileExtension(filename);

  if (ext === "txt") {
    return buffer.toString("utf-8");
  }

  if (ext === "pdf") {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

      if (typeof pdfjs.GlobalWorkerOptions.workerSrc === "string" &&
          pdfjs.GlobalWorkerOptions.workerSrc.startsWith("./")) {
        const path = await import("path");
        const workerPath = path.join(
          process.cwd(),
          "node_modules",
          "pdfjs-dist",
          "legacy",
          "build",
          pdfjs.GlobalWorkerOptions.workerSrc.replace("./", "")
        );
        pdfjs.GlobalWorkerOptions.workerSrc = `file:///${workerPath.replace(/\\/g, "/")}`;
      }

      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: false,
        disableFontFace: true,
        verbosity: 0,
      }).promise;

      const parts: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const lines: string[] = [];
        for (const item of content.items) {
          if ("str" in item) lines.push(item.str as string);
        }
        parts.push(lines.join(" "));
      }

      await doc.destroy();
      return parts.join("\n");
    } catch (error) {
      logger.error("PDF parsing failed", e(error));
      throw new AppError(
        "RESUME_PARSE_ERROR",
        error instanceof Error ? error.message : "Failed to parse PDF file",
        400
      );
    }
  }

  if (ext === "docx") {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      logger.error("DOCX parsing failed", e(error));
      throw new AppError(
        "RESUME_PARSE_ERROR",
        error instanceof Error ? error.message : "Failed to parse DOCX file",
        400
      );
    }
  }

  throw new AppError(
    "UNSUPPORTED_FILE_TYPE",
    `Unsupported file type: .${ext}. Please upload a PDF, DOCX, or TXT file.`,
    400
  );
}

export async function uploadAndParseResume(
  userId: string,
  buffer: Buffer,
  filename: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ParsedResume> {
  onProgress?.(10, "Extracting text from file...");
  const rawText = await extractTextFromFile(buffer, filename);
  
  const parsed = await parseResumeWithAI(rawText, onProgress);

  onProgress?.(90, "Finalizing profile data...");
  const existingProfile = await getProfile(userId);

  await upsertProfile(userId, {
    personal: existingProfile?.personal ?? { fullName: "" },
    preferences: existingProfile?.preferences,
    jobApplication: existingProfile?.jobApplication,
  });

  const resumeData = {
    rawText,
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    linkedin: parsed.linkedin,
    github: parsed.github,
    portfolio: parsed.portfolio,
    skills: parsed.skills,
    education: parsed.education,
    experience: parsed.experience,
    projects: parsed.projects,
  };

  const { Profile } = await import("@/models/profile");
  const { connectDB } = await import("@/lib/db");
  await connectDB();

  await Profile.findOneAndUpdate(
    { userId },
    { $set: { resume: resumeData } },
    { returnDocument: "after" }
  );

  onProgress?.(100, "Done");
  return parsed;
}

export async function getResume(userId: string): Promise<ResumeData | null> {
  const profile = await getProfile(userId);
  if (!profile || !profile.resume) return null;
  const safeResume = { ...profile.resume, rawText: undefined };
  return safeResume as unknown as ResumeData;
}

export async function deleteResume(userId: string): Promise<void> {
  const { Profile } = await import("@/models/profile");
  const { connectDB } = await import("@/lib/db");
  await connectDB();

  await Profile.findOneAndUpdate(
    { userId },
    { $unset: { resume: "" } },
    { returnDocument: "after" }
  );

  logger.info("Resume deleted", { userId });
}
