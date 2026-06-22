import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { sendEntrySchema } from "@/modules/bulk/validation";
import { sendEntry } from "@/modules/bulk/service";
import { requireAuth } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { parseFormDataFiles } from "@/utils/attachments";
import { getAttachments } from "@/modules/attachments/service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const entryId = formData.get("entryId") as string;
      const attachmentIdsRaw = formData.getAll("attachmentIds") as string[];
      const attachmentIds = attachmentIdsRaw.flatMap((v) => v.split(",")).filter(Boolean);

      const uploadedFiles = await parseFormDataFiles(formData, "attachments");

      const input = validate(sendEntrySchema, { entryId });

      const resolvedAttachments = getAttachments(attachmentIds);
      const allAttachments = [
        ...resolvedAttachments.map((a) => ({
          filename: a.filename,
          content: a.buffer,
          contentType: a.contentType,
        })),
        ...uploadedFiles.map((f) => ({
          filename: f.filename,
          content: f.buffer,
          contentType: f.contentType,
        })),
      ];

      const result = await sendEntry(
        input.entryId,
        user.userId,
        user.name,
        allAttachments.length > 0 ? allAttachments : undefined
      );
      return success(result);
    }

    const body = await request.json();
    const input = validate(sendEntrySchema, body);

    const result = await sendEntry(input.entryId, user.userId, user.name);
    return success(result);
  } catch (error) {
    return failure(error);
  }
}
