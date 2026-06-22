import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { requireAuth } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { validateFile, validateAttachments, parseFormDataFiles, FILE_SIZE_LIMIT, TOTAL_ATTACHMENT_LIMIT, MAX_FILES_PER_SEND } from "@/utils/attachments";
import { storeAttachments } from "@/modules/attachments/service";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new AppError(
        "INVALID_CONTENT_TYPE",
        "Expected multipart/form-data",
        400
      );
    }

    const formData = await request.formData();

    const files = formData.getAll("attachments").filter(
      (entry): entry is File => entry instanceof File && entry.size > 0
    );

    if (files.length === 0) {
      throw new AppError(
        "NO_FILES",
        "No files provided. Use field name 'attachments'.",
        400
      );
    }

    if (files.length > MAX_FILES_PER_SEND) {
      throw new AppError(
        "TOO_MANY_FILES",
        `Maximum ${MAX_FILES_PER_SEND} files allowed.`,
        400
      );
    }

    const fileList = files as unknown as File[];
    const validation = validateAttachments(fileList);
    if (!validation.ok) {
      throw new AppError("ATTACHMENT_INVALID", validation.error, 400);
    }

    const parsed = await parseFormDataFiles(formData, "attachments");

    const ids = storeAttachments(parsed);

    return success({
      ids,
      count: ids.length,
      totalSize: parsed.reduce((s, f) => s + f.size, 0),
      files: parsed.map((f) => ({
        filename: f.filename,
        contentType: f.contentType,
        size: f.size,
      })),
    });
  } catch (error) {
    return failure(error);
  }
}
