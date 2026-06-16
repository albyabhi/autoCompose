import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { requireAuth } from "@/lib/auth/session";
import { uploadAndParseResume, getResume, deleteResume } from "@/modules/resume/service";
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
// PURPOSE: API endpoint for uploading, retrieving, and deleting parsed resumes.
// HOW IT WORKS: POST accepts multipart FormData with a file (PDF/DOCX/TXT, max 10MB)
//   and optional modelId. Uses Server-Sent Events (NDJSON) to stream progress updates
//   during parsing. GET returns the stored resume data. DELETE removes the resume
//   from the profile. File type and size are validated before processing.
// INTEGRATION: Resume service (uploadAndParseResume), auth, AI types
// ============================================================
