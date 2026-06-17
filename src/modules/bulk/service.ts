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
  userName?: string | null
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

  const body = entry.generatedContent ?? "";
  const parsed = parseEmailContent(body);
  const subject = entry.subject || parsed.subject;

  const result = await dispatchSendEmail({
    userId,
    userName,
    to: entry.recipient,
    subject,
    body,
    rateLimitKey: `batch-send:${userId}`,
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
