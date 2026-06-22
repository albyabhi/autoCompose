import "server-only";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";

interface StoredAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  buffer: Buffer;
  createdAt: Date;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes

const store = new Map<string, StoredAttachment>();

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    let removed = 0;
    for (const [id, attachment] of store) {
      if (now - attachment.createdAt.getTime() > TTL_MS) {
        store.delete(id);
        removed++;
      }
    }
    if (removed > 0) {
      logger.debug(`Cleaned up ${removed} expired attachments`);
    }
  }, 60_000);
}

export function storeAttachment(file: {
  filename: string;
  contentType: string;
  buffer: Buffer;
}): string {
  const id = randomBytes(16).toString("hex");
  store.set(id, {
    id,
    filename: file.filename,
    contentType: file.contentType,
    size: file.buffer.length,
    buffer: file.buffer,
    createdAt: new Date(),
  });
  ensureCleanup();
  return id;
}

export function storeAttachments(
  files: Array<{ filename: string; contentType: string; buffer: Buffer }>
): string[] {
  return files.map((f) => storeAttachment(f));
}

export function getAttachment(id: string): StoredAttachment | null {
  return store.get(id) ?? null;
}

export function getAttachments(ids: string[]): StoredAttachment[] {
  const results: StoredAttachment[] = [];
  for (const id of ids) {
    const attachment = getAttachment(id);
    if (attachment) results.push(attachment);
  }
  return results;
}

export function deleteAttachment(id: string): void {
  store.delete(id);
}

export function deleteAttachments(ids: string[]): void {
  for (const id of ids) {
    store.delete(id);
  }
}

export function cleanupAllForTest(): void {
  store.clear();
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
