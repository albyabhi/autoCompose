export const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB per file
export const TOTAL_ATTACHMENT_LIMIT = 24 * 1024 * 1024; // 24 MB total
export const MAX_FILES_PER_SEND = 20;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
];

const ALLOWED_SET = new Set(ALLOWED_MIME_TYPES);

export interface AttachmentFile {
  filename: string;
  contentType: string;
  size: number;
  buffer: Buffer;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateFile(file: File): ValidationResult {
  if (file.size > FILE_SIZE_LIMIT) {
    return {
      ok: false,
      error: `"${file.name}" exceeds the 10 MB size limit (${formatFileSize(file.size)}).`,
    };
  }
  if (!ALLOWED_SET.has(file.type)) {
    return {
      ok: false,
      error: `"${file.name}" has unsupported type "${file.type}". Allowed: PDF, JPEG, PNG, GIF, WebP, DOCX, TXT, CSV.`,
    };
  }
  return { ok: true };
}

export function validateAttachments(files: File[]): ValidationResult {
  if (files.length > MAX_FILES_PER_SEND) {
    return {
      ok: false,
      error: `Maximum ${MAX_FILES_PER_SEND} files allowed per email.`,
    };
  }
  if (files.length === 0) {
    return { ok: true };
  }
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > TOTAL_ATTACHMENT_LIMIT) {
    return {
      ok: false,
      error: `Total attachment size (${formatFileSize(totalSize)}) exceeds the 24 MB limit.`,
    };
  }
  for (const file of files) {
    const result = validateFile(file);
    if (!result.ok) return result;
  }
  return { ok: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function parseFormDataFiles(
  formData: FormData,
  fieldName = "attachments"
): Promise<AttachmentFile[]> {
  const entries = formData.getAll(fieldName);
  const results: AttachmentFile[] = [];
  for (const entry of entries) {
    if (entry instanceof File && entry.size > 0) {
      const buffer = await fileToBuffer(entry);
      results.push({
        filename: entry.name,
        contentType: entry.type || "application/octet-stream",
        size: entry.size,
        buffer,
      });
    }
  }
  return results;
}
