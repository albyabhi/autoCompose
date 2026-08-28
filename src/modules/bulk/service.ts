import { connectDB } from "@/lib/db";
import { BulkEntry, IBulkEntry } from "@/models/bulk-entry";
import { Session } from "@/models/session";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";
import { getAIProvider } from "@/modules/ai/factory";
import { getProfile } from "@/modules/profile/service";
import { buildProfileContext } from "@/modules/profile/context-builder";
import { dispatchSendEmail } from "@/modules/email/dispatch";
import { parseEmailContent } from "@/modules/email/content";
import type { NodemailerAttachment } from "@/modules/email/sender";
import type { BulkEntryData } from "./types";
import type { CreateEntryInput, UpdateEntryInput } from "./validation";
import type { ModelId } from "@/modules/ai/types";
import type { EmailCategory } from "@/modules/email/categories";

function toEntryData(entry: IBulkEntry): BulkEntryData {
  return {
    id: entry._id.toString(),
    sessionId: entry.sessionId.toString(),
    userId: entry.userId,
    category: entry.category as EmailCategory,
    prompt: entry.prompt,
    recipient: entry.recipient,
    status: entry.status,
    generatedContent: entry.generatedContent,
    subject: entry.subject,
    modelUsed: entry.modelUsed,
    errorMessage: entry.errorMessage,
    sortOrder: entry.sortOrder,
    createdAt: entry.createdAt?.toISOString?.() ?? String(entry.createdAt),
    updatedAt: entry.updatedAt?.toISOString?.() ?? String(entry.updatedAt),
  };
}

export async function createEntry(
  userId: string,
  input: CreateEntryInput
): Promise<BulkEntryData> {
  await connectDB();

  const session = await Session.findOne({
    _id: input.sessionId,
    userId,
    isDeleted: false,
  });
  if (!session) throw new NotFoundError("Session not found");

  const maxOrder = await BulkEntry.findOne({ sessionId: session._id })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();

  const entry = await BulkEntry.create({
    sessionId: session._id,
    userId,
    category: input.category,
    prompt: input.prompt,
    recipient: input.recipient,
    sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
  });

  return toEntryData(entry);
}

export async function createEntries(
  userId: string,
  sessionId: string,
  entries: Array<Omit<CreateEntryInput, "sessionId">>
): Promise<BulkEntryData[]> {
  await connectDB();

  const session = await Session.findOne({
    _id: sessionId,
    userId,
    isDeleted: false,
  });
  if (!session) throw new NotFoundError("Session not found");

  const maxOrder = await BulkEntry.findOne({ sessionId: session._id })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();
  let nextOrder = (maxOrder?.sortOrder ?? -1) + 1;

  const docs = entries.map((e) => ({
    sessionId: session._id,
    userId,
    category: e.category,
    prompt: e.prompt,
    recipient: e.recipient,
    sortOrder: nextOrder++,
  }));

  const created = await BulkEntry.create(docs);
  return created.map(toEntryData);
}

export async function listEntries(
  sessionId: string,
  userId: string
): Promise<BulkEntryData[]> {
  await connectDB();

  const session = await Session.findOne({
    _id: sessionId,
    userId,
    isDeleted: false,
  });
  if (!session) throw new NotFoundError("Session not found");

  const entries = await BulkEntry.find({ sessionId: session._id })
    .sort({ sortOrder: 1 })
    .lean();

  return entries.map(toEntryData);
}

export async function updateEntry(
  entryId: string,
  userId: string,
  input: UpdateEntryInput
): Promise<BulkEntryData> {
  await connectDB();

  const entry = await BulkEntry.findOneAndUpdate(
    { _id: entryId, userId, status: { $in: ["pending", "failed"] } },
    { $set: input },
    { returnDocument: "after", runValidators: true }
  );

  if (!entry) throw new NotFoundError("Entry not found or cannot be updated");

  return toEntryData(entry);
}

export async function deleteEntry(
  entryId: string,
  userId: string
): Promise<void> {
  await connectDB();

  const entry = await BulkEntry.findOneAndDelete({
    _id: entryId,
    userId,
  });

  if (!entry) throw new NotFoundError("Entry not found");
}

export async function batchUpdateCategory(
  userId: string,
  sessionId: string,
  category: EmailCategory
): Promise<number> {
  await connectDB();

  const session = await Session.findOne({
    _id: sessionId,
    userId,
    isDeleted: false,
  });
  if (!session) throw new NotFoundError("Session not found");

  const result = await BulkEntry.updateMany(
    { sessionId: session._id, userId, status: { $in: ["pending", "failed"] } },
    { $set: { category } }
  );

  return result.modifiedCount;
}

export async function generateEntry(
  entryId: string,
  userId: string,
  modelId: ModelId
): Promise<BulkEntryData> {
  await connectDB();

  const entry = await BulkEntry.findOne({ _id: entryId, userId });
  if (!entry) throw new NotFoundError("Entry not found");

  await BulkEntry.updateOne(
    { _id: entry._id },
    { $set: { status: "generating", errorMessage: undefined } }
  );

  try {
    const provider = getAIProvider();
    const category = entry.category as EmailCategory;
    let profileContext;

    try {
      const profile = await getProfile(userId);
      profileContext = buildProfileContext(profile, category, entry.prompt);
    } catch {
      // Profile is optional — proceed without context
    }

    const response = await provider.complete({
      prompt: entry.prompt,
      category,
      config: { modelId },
      profileContext: profileContext ?? undefined,
    });

    const { subject } = parseEmailContent(response.content);

    const updated = await BulkEntry.findOneAndUpdate(
      { _id: entry._id },
      {
        $set: {
          status: "generated",
          generatedContent: response.content,
          subject: subject || "",
          modelUsed: response.modelUsed,
          errorMessage: undefined,
        },
      },
      { returnDocument: "after" }
    );

    recordAudit({
      action: "email.generated",
      entityType: "BulkEntry",
      entityId: entry._id.toString(),
      userId,
      metadata: { modelUsed: response.modelUsed, category, source: "batch" },
    });

    return toEntryData(updated!);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    await BulkEntry.updateOne(
      { _id: entry._id },
      { $set: { status: "failed", errorMessage: message } }
    );
    throw error;
  }
}

export async function sendEntry(
  entryId: string,
  userId: string,
  userName?: string | null,
  attachments?: NodemailerAttachment[]
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  await connectDB();

  const entry = await BulkEntry.findOne({ _id: entryId, userId });
  if (!entry) throw new NotFoundError("Entry not found");
  if (entry.status !== "generated")
    throw new Error("Entry must be generated before sending");

  await BulkEntry.updateOne(
    { _id: entry._id },
    { $set: { status: "sending" } }
  );

  const parsed = parseEmailContent(entry.generatedContent ?? "");
  const body = parsed.body;
  const subject = entry.subject || parsed.subject;

  const result = await dispatchSendEmail({
    userId,
    userName,
    to: entry.recipient,
    subject,
    body,
    attachments,
    rateLimitKey: `send-email:${userId}`,
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
  });

  if (result.ok) {
    await BulkEntry.updateOne(
      { _id: entry._id },
      { $set: { status: "sent" } }
    );

    recordAudit({
      action: "email.sent",
      entityType: "BulkEntry",
      entityId: entry._id.toString(),
      userId,
      metadata: { to: entry.recipient, source: "batch" },
    });

    return { ok: true, messageId: result.messageId };
  } else {
    await BulkEntry.updateOne(
      { _id: entry._id },
      { $set: { status: "generated", errorMessage: result.message } }
    );

    return { ok: false, error: result.message };
  }
}

// ============================================================
// FILE: src/modules/bulk/service.ts
// ============================================================
// PURPOSE: Manages batch email operations — create multiple emails in a session, generate them with AI, and send them individually.
// HOW IT WORKS: A "bulk session" is a Session with many BulkEntry children (each = one recipient + prompt). Flow:
//   - createEntry()/createEntries(): Add entries to a session. Validates session exists and belongs to user. Auto-orders by sortOrder.
//   - listEntries(): Returns all entries for a session in order.
//   - updateEntry(): Updates prompt/recipient/category for pending/failed entries only (not sent/generating).
//   - deleteEntry(): Removes an entry.
//   - batchUpdateCategory(): Changes category for all pending/failed entries in a session.
//   - generateEntry(): The AI generation step. Sets status="generating", calls AI provider with user's profile context, parses subject from result, saves generatedContent + subject + modelUsed, sets status="generated". On error: sets status="failed" with errorMessage. Logs audit.
//   - sendEntry(): Sends a generated entry. Rate limited (5/min). Calls dispatchSendEmail() which handles credential decryption + SMTP. On success: status="sent", audit log. On failure: status back to "generated" with error.
//   Entries flow: pending -> generating -> generated -> sending -> sent (or failed -> generated on retry).
// INTEGRATION: Session/BulkEntry models; AI provider factory; profile service + context builder; email content parser; email dispatch; audit logging; auth ownership. Used by batch API routes (src/app/api/batch/**/route.ts) and batch UI components (src/features/batch/components/**).
// ============================================================
