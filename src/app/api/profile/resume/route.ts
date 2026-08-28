import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { requireAuth } from "@/lib/auth/session";
import { uploadAndParseResume, getResume, updateResume, deleteResume } from "@/modules/resume/service";
import { resumeUpdateSchema } from "@/modules/profile/validation";
import { modelIdSchema, type ModelId } from "@/modules/ai/types";
import { AppError, ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new AppError("MISSING_FILE", "No file provided. Please upload a resume file.", 400);
    }

    const rawModelId = formData.get("modelId");
    const parsedModelId = rawModelId
      ? modelIdSchema.safeParse(rawModelId)
      : undefined;
    if (parsedModelId && !parsedModelId.success) {
      throw new ValidationError("Invalid modelId", parsedModelId.error.flatten());
    }
    const modelId: ModelId = (parsedModelId?.data as ModelId | undefined) ?? "deepseek";

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new AppError("FILE_TOO_LARGE", "File size exceeds 10MB limit", 400);
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".txt")) {
      throw new AppError(
        "INVALID_FILE_TYPE",
        "Unsupported file type. Please upload a PDF, DOCX, or TXT file.",
        400
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (progress: number, message: string) => {
          const payload = JSON.stringify({ type: "progress", progress, message }) + "\n";
          controller.enqueue(encoder.encode(payload));
        };

        try {
          sendProgress(0, "Initializing upload...");
          const buffer = Buffer.from(await file.arrayBuffer());
          
          const result = await uploadAndParseResume(user.userId, buffer, file.name, modelId, sendProgress);
          
          const finalPayload = JSON.stringify({ type: "success", data: { resume: result } }) + "\n";
          controller.enqueue(encoder.encode(finalPayload));
          controller.close();
        } catch (error) {
          const errPayload = JSON.stringify({ 
            type: "error", 
            message: error instanceof Error ? error.message : "Internal Server Error" 
          }) + "\n";
          controller.enqueue(encoder.encode(errPayload));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { 
        "Content-Type": "application/x-ndjson", 
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  } catch (error) {
    return failure(error);
  }
}

export async function GET() {
  try {
    const user = await requireAuth();
    const resume = await getResume(user.userId);
    return success({ resume });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body: Record<string, unknown> = await request.json();

    const parsed = resumeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid resume data", parsed.error.flatten());
    }

    const result = await updateResume(user.userId, parsed.data);
    return success({ resume: result });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireAuth();
    await deleteResume(user.userId);
    return success({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/profile/resume/route.ts
// ============================================================
// PURPOSE: API endpoint for resume upload/parsing with real-time progress streaming, plus CRUD for the parsed resume data.
// HOW IT WORKS:
//   - POST /api/profile/resume: Multipart FormData upload (PDF/DOCX/TXT, max 10MB). Validates file type/size. Accepts optional modelId for AI parsing. Returns a Server-Sent Events stream (NDJSON) with progress events: {type: "progress", progress: 0-100, message} then {type: "success", data: {resume}} or {type: "error", message}. Calls uploadAndParseResume() which extracts text -> AI parses -> saves to Profile. Real-time progress enables UI to show "Extracting text...", "Analyzing with AI...", "Structuring data...", "Finalizing...".
//   - GET /api/profile/resume: Returns stored resume data (sans rawText) for the current user.
//   - PATCH /api/profile/resume: Partial update of resume fields (skills, education, experience, projects, contact info) validated against resumeUpdateSchema.
//   - DELETE /api/profile/resume: Removes the entire resume section from the profile.
//   File validation: Only application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain accepted.
// INTEGRATION: Resume service (uploadAndParseResume, getResume, updateResume, deleteResume), auth (requireAuth), AI types (modelIdSchema), validation (resumeUpdateSchema), AppError/ValidationError. Called by resume widget component (src/features/profile/components/resume-widget.tsx).
// ============================================================
