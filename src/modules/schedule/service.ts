import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { ownedFilter } from "@/lib/auth/ownership";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { Schedule, type ISchedule } from "@/models/schedule";
import { ScheduledEmail, type IScheduledEmail } from "@/models/scheduled-email";
import { BulkEntry } from "@/models/bulk-entry";
import { getAIProvider } from "@/modules/ai/factory";
import { getProfile } from "@/modules/profile/service";
import { buildProfileContext } from "@/modules/profile/context-builder";
import { parseEmailContent } from "@/modules/email/content";
import { dispatchSendEmail } from "@/modules/email/dispatch";
import type { EmailCategory } from "@/modules/email/categories";
import type {
  AddScheduledEmailInput,
  CreateScheduleInput,
  ListSchedulesInput,
  ProcessSchedulesInput,
  UpdateScheduledEmailInput,
  UpdateScheduleInput,
} from "./validation";
import type {
  AddScheduledEmailsResult,
  PaginatedScheduleResult,
  ProcessSchedulesResult,
  ScheduleData,
  ScheduleDetailData,
  ScheduledEmailData,
} from "./types";

const PROCESSABLE_DELIVERY_STATES = ["awaiting_content", "ready"] as const;
const ACTIVE_DELIVERY_STATES = ["awaiting_content", "ready", "sending"] as const;

function toIso(value: Date | undefined): string | undefined {
  return value?.toISOString?.();
}

function toScheduleData(schedule: ISchedule, counts?: {
  totalCount?: number;
  pendingCount?: number;
  sentCount?: number;
  failedCount?: number;
}): ScheduleData {
  return {
    id: schedule._id.toString(),
    userId: schedule.userId,
    name: schedule.name,
    scheduledAt: schedule.scheduledAt.toISOString(),
    timezone: schedule.timezone,
    status: schedule.status,
    totalCount: counts?.totalCount,
    pendingCount: counts?.pendingCount,
    sentCount: counts?.sentCount,
    failedCount: counts?.failedCount,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  };
}

function toScheduledEmailData(email: IScheduledEmail): ScheduledEmailData {
  return {
    id: email._id.toString(),
    scheduleId: email.scheduleId.toString(),
    userId: email.userId,
    sourceType: email.sourceType,
    sourceSessionId: email.sourceSessionId?.toString(),
    sourceMessageId: email.sourceMessageId?.toString(),
    sourceBulkEntryId: email.sourceBulkEntryId?.toString(),
    to: email.to,
    subject: email.subject,
    body: email.body,
    category: email.category,
    prompt: email.prompt,
    modelId: email.modelId,
    deliveryState: email.deliveryState,
    claimedAt: toIso(email.claimedAt),
    sentAt: toIso(email.sentAt),
    errorCode: email.errorCode,
    errorMessage: email.errorMessage,
    sortOrder: email.sortOrder,
    createdAt: email.createdAt.toISOString(),
    updatedAt: email.updatedAt.toISOString(),
  };
}

async function getScheduleOrThrow(scheduleId: string, userId: string): Promise<ISchedule> {
  const schedule = await Schedule.findOne(ownedFilter(userId, { _id: scheduleId }));
  if (!schedule) throw new NotFoundError("Schedule not found");
  return schedule;
}

async function buildScheduledEmailDoc(
  userId: string,
  scheduleId: mongoose.Types.ObjectId,
  input: AddScheduledEmailInput,
  sortOrder: number
): Promise<Partial<IScheduledEmail>> {
  if (input.sourceType === "single") {
    return {
      scheduleId,
      userId,
      sourceType: "single",
      sourceSessionId: input.sourceSessionId
        ? new mongoose.Types.ObjectId(input.sourceSessionId)
        : undefined,
      sourceMessageId: input.sourceMessageId
        ? new mongoose.Types.ObjectId(input.sourceMessageId)
        : undefined,
      to: input.to.trim(),
      subject: input.subject.trim(),
      body: input.body,
      category: input.category,
      prompt: input.prompt,
      modelId: input.modelId,
      deliveryState: "ready",
      sortOrder,
    };
  }

  const entry = await BulkEntry.findOne(
    ownedFilter(userId, { _id: input.sourceBulkEntryId })
  );
  if (!entry) throw new NotFoundError("Bulk entry not found");
  if (!entry.recipient?.trim()) {
    throw new ValidationError("Bulk entry needs a valid recipient before it can be scheduled.");
  }

  if (entry.status === "generated" && entry.generatedContent) {
    const parsed = parseEmailContent(entry.generatedContent);
    return {
      scheduleId,
      userId,
      sourceType: "batch",
      sourceSessionId: entry.sessionId,
      sourceBulkEntryId: entry._id,
      to: entry.recipient.trim(),
      subject: entry.subject || parsed.subject,
      body: parsed.body,
      category: entry.category,
      prompt: entry.prompt,
      modelId: input.modelId,
      deliveryState: "ready",
      sortOrder,
    };
  }

  if (!entry.prompt || entry.prompt.trim().length < 10) {
    throw new ValidationError("Bulk entry needs a prompt of at least 10 characters before it can be scheduled.");
  }

  return {
    scheduleId,
    userId,
    sourceType: "batch",
    sourceSessionId: entry.sessionId,
    sourceBulkEntryId: entry._id,
    to: entry.recipient.trim(),
    category: entry.category,
    prompt: entry.prompt,
    modelId: input.modelId,
    deliveryState: "awaiting_content",
    sortOrder,
  };
}

export async function createSchedule(
  userId: string,
  input: CreateScheduleInput
): Promise<ScheduleDetailData> {
  await connectDB();

  const schedule = await Schedule.create({
    userId,
    name: input.name,
    scheduledAt: input.scheduledAt,
    timezone: input.timezone,
  });

  if (input.emails?.length) {
    await addScheduledEmails(schedule._id.toString(), userId, input.emails);
  }

  await recordAudit({
    action: "schedule.created",
    entityType: "Schedule",
    entityId: schedule._id.toString(),
    userId,
    metadata: { scheduledAt: schedule.scheduledAt.toISOString() },
  });

  return getSchedule(schedule._id.toString(), userId);
}

export async function listSchedules(
  userId: string,
  input: ListSchedulesInput
): Promise<PaginatedScheduleResult> {
  await connectDB();

  const { page, pageSize, status } = input;
  const skip = (page - 1) * pageSize;
  const filter = ownedFilter(userId, status ? { status } : { status: { $ne: "cancelled" } });

  const [schedules, total] = await Promise.all([
    Schedule.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
    Schedule.countDocuments(filter),
  ]);

  const scheduleIds = schedules.map((schedule) => schedule._id);
  const counts = await ScheduledEmail.aggregate([
    { $match: { scheduleId: { $in: scheduleIds } } },
    {
      $group: {
        _id: "$scheduleId",
        totalCount: { $sum: 1 },
        sentCount: { $sum: { $cond: [{ $eq: ["$deliveryState", "sent"] }, 1, 0] } },
        failedCount: { $sum: { $cond: [{ $eq: ["$deliveryState", "failed"] }, 1, 0] } },
        pendingCount: {
          $sum: {
            $cond: [
              { $in: ["$deliveryState", ["awaiting_content", "ready", "sending"]] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  const countMap = new Map(counts.map((count) => [count._id.toString(), count]));

  return {
    items: schedules.map((schedule) =>
      toScheduleData(schedule, countMap.get(schedule._id.toString()))
    ),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function listActiveSchedules(userId: string): Promise<ScheduleData[]> {
  await connectDB();
  const schedules = await Schedule.find(
    ownedFilter(userId, { status: "active", scheduledAt: { $gt: new Date() } })
  ).sort({ scheduledAt: 1 });

  const scheduleIds = schedules.map((s) => s._id);
  const counts = await ScheduledEmail.aggregate([
    { $match: { scheduleId: { $in: scheduleIds } } },
    { $group: { _id: "$scheduleId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  return schedules.map((s) =>
    toScheduleData(s, {
      totalCount: countMap.get(s._id.toString()) ?? 0,
    })
  );
}

export async function getSchedule(
  scheduleId: string,
  userId: string
): Promise<ScheduleDetailData> {
  await connectDB();
  const schedule = await getScheduleOrThrow(scheduleId, userId);
  const emails = await ScheduledEmail.find(ownedFilter(userId, { scheduleId: schedule._id }))
    .sort({ sortOrder: 1 });
  return {
    ...toScheduleData(schedule, {
      totalCount: emails.length,
      sentCount: emails.filter((email) => email.deliveryState === "sent").length,
      failedCount: emails.filter((email) => email.deliveryState === "failed").length,
      pendingCount: emails.filter((email) =>
        (ACTIVE_DELIVERY_STATES as readonly string[]).includes(email.deliveryState)
      ).length,
    }),
    emails: emails.map(toScheduledEmailData),
  };
}

export async function updateSchedule(
  scheduleId: string,
  userId: string,
  input: UpdateScheduleInput
): Promise<ScheduleData> {
  await connectDB();
  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.scheduledAt !== undefined) update.scheduledAt = input.scheduledAt;
  if (input.timezone !== undefined) update.timezone = input.timezone;
  if (input.status !== undefined) update.status = input.status;

  const schedule = await Schedule.findOneAndUpdate(
    ownedFilter(userId, { _id: scheduleId }),
    { $set: update },
    { returnDocument: "after", runValidators: true }
  );
  if (!schedule) throw new NotFoundError("Schedule not found");

  await recordAudit({
    action: input.status === "cancelled" ? "schedule.cancelled" : "schedule.updated",
    entityType: "Schedule",
    entityId: scheduleId,
    userId,
  });

  return toScheduleData(schedule);
}

export async function deleteSchedule(scheduleId: string, userId: string): Promise<void> {
  await connectDB();
  const schedule = await Schedule.findOne(ownedFilter(userId, { _id: scheduleId }));
  if (!schedule) throw new NotFoundError("Schedule not found");
  // Emails first so a crash can never leave orphaned items behind.
  await ScheduledEmail.deleteMany(ownedFilter(userId, { scheduleId: schedule._id }));
  await Schedule.deleteOne(ownedFilter(userId, { _id: scheduleId }));
  await recordAudit({
    action: "schedule.deleted",
    entityType: "Schedule",
    entityId: scheduleId,
    userId,
  });
}

export async function clearAllSchedules(
  userId: string
): Promise<{ clearedSchedules: number; clearedEmails: number }> {
  await connectDB();
  const schedules = await Schedule.find(ownedFilter(userId, {}))
    .select("_id")
    .lean();
  const ids = schedules.map((schedule) => schedule._id);
  if (ids.length === 0) return { clearedSchedules: 0, clearedEmails: 0 };
  const emailsResult = await ScheduledEmail.deleteMany(
    ownedFilter(userId, { scheduleId: { $in: ids } })
  );
  const schedulesResult = await Schedule.deleteMany(ownedFilter(userId, { _id: { $in: ids } }));
  logger.info("All schedules cleared", {
    userId,
    clearedSchedules: schedulesResult.deletedCount ?? 0,
    clearedEmails: emailsResult.deletedCount ?? 0,
  });
  return {
    clearedSchedules: schedulesResult.deletedCount ?? 0,
    clearedEmails: emailsResult.deletedCount ?? 0,
  };
}

export async function addScheduledEmails(
  scheduleId: string,
  userId: string,
  emails: AddScheduledEmailInput[]
): Promise<AddScheduledEmailsResult> {
  await connectDB();
  const schedule = await getScheduleOrThrow(scheduleId, userId);
  if (schedule.status !== "active" || schedule.scheduledAt <= new Date()) {
    throw new ValidationError("Emails can only be added to active future schedules.");
  }

  let skippedCount = 0;

  // Step 1: In-memory deduplication (same request, same sourceBulkEntryId / sourceMessageId)
  {
    const seenBulkIds = new Set<string>();
    const seenMsgIds = new Set<string>();
    const before = emails.length;
    emails = emails.filter((e) => {
      if (e.sourceType === "batch") {
        if (seenBulkIds.has(e.sourceBulkEntryId)) return false;
        seenBulkIds.add(e.sourceBulkEntryId);
        return true;
      }
      if (e.sourceType === "single" && e.sourceMessageId) {
        if (seenMsgIds.has(e.sourceMessageId)) return false;
        seenMsgIds.add(e.sourceMessageId);
        return true;
      }
      return true;
    });
    skippedCount += before - emails.length;
  }

  // Step 2: DB deduplication - batch entries by sourceBulkEntryId
  {
    const batchEntryIds = emails
      .filter((e) => e.sourceType === "batch")
      .map((e) => e.sourceBulkEntryId);

    if (batchEntryIds.length > 0) {
      const existing = await ScheduledEmail.find({
        scheduleId: schedule._id,
        sourceBulkEntryId: { $in: batchEntryIds },
      })
        .select("sourceBulkEntryId")
        .lean();

      const existingIds = new Set(
        existing.map((e) => e.sourceBulkEntryId?.toString())
      );

      const before = emails.length;
      emails = emails.filter(
        (e) => e.sourceType !== "batch" || !existingIds.has(e.sourceBulkEntryId)
      );
      skippedCount += before - emails.length;
    }
  }

  // Step 3: DB deduplication - single emails by sourceMessageId
  {
    const msgIds: string[] = [];
    for (const e of emails) {
      if (e.sourceType === "single" && e.sourceMessageId) {
        msgIds.push(e.sourceMessageId);
      }
    }

    if (msgIds.length > 0) {
      const existing = await ScheduledEmail.find({
        scheduleId: schedule._id,
        sourceMessageId: { $in: msgIds },
      })
        .select("sourceMessageId")
        .lean();

      const existingIds = new Set(
        existing.map((e) => e.sourceMessageId?.toString())
      );

      const before = emails.length;
      emails = emails.filter((e) => {
        if (e.sourceType !== "single") return true;
        if (!e.sourceMessageId) return true;
        return !existingIds.has(e.sourceMessageId);
      });
      skippedCount += before - emails.length;
    }
  }

  const maxOrder = await ScheduledEmail.findOne({ scheduleId: schedule._id })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();
  let sortOrder = (maxOrder?.sortOrder ?? -1) + 1;

  const added: IScheduledEmail[] = [];

  for (const email of emails) {
    try {
      const doc = await buildScheduledEmailDoc(userId, schedule._id, email, sortOrder++);
      const created = await ScheduledEmail.create(doc);
      added.push(created);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as Record<string, unknown>).code === 11000
      ) {
        logger.error("Skipped scheduled email due to duplicate key", {
          scheduleId,
          userId,
          sourceType: email.sourceType,
          sourceMessageId: email.sourceType === "single" ? email.sourceMessageId : undefined,
          sourceBulkEntryId: email.sourceType === "batch" ? email.sourceBulkEntryId : undefined,
          to: "to" in email ? email.to : undefined,
          errorMessage: error.message,
        });
        skippedCount++;
        continue;
      }
      throw error;
    }
  }

  if (added.length > 0) {
    await recordAudit({
      action: "schedule.email_added",
      entityType: "Schedule",
      entityId: scheduleId,
      userId,
      metadata: { count: added.length, skipped: skippedCount },
    });
  }

  return {
    emails: added.map(toScheduledEmailData),
    skipped: skippedCount,
  };
}

export async function updateScheduledEmail(
  scheduleId: string,
  emailId: string,
  userId: string,
  input: UpdateScheduledEmailInput
): Promise<ScheduledEmailData> {
  await connectDB();
  await getScheduleOrThrow(scheduleId, userId);

  const email = await ScheduledEmail.findOne(
    ownedFilter(userId, { _id: emailId, scheduleId })
  );
  if (!email) throw new NotFoundError("Scheduled email not found");
  if (email.deliveryState === "sent") {
    throw new ValidationError("Sent scheduled emails cannot be edited.");
  }

  if (input.to !== undefined) email.to = input.to.trim();
  if (input.subject !== undefined) email.subject = input.subject.trim();
  if (input.body !== undefined) email.body = input.body;
  if (input.retry) {
    email.errorCode = undefined;
    email.errorMessage = undefined;
    email.claimedAt = undefined;
    email.deliveryState = email.subject && email.body ? "ready" : "awaiting_content";
  } else if (email.subject && email.body && email.deliveryState === "awaiting_content") {
    email.deliveryState = "ready";
  }
  await email.save();

  return toScheduledEmailData(email);
}

export async function deleteScheduledEmail(
  scheduleId: string,
  emailId: string,
  userId: string
): Promise<void> {
  await connectDB();
  await getScheduleOrThrow(scheduleId, userId);
  const result = await ScheduledEmail.findOneAndDelete(
    ownedFilter(userId, { _id: emailId, scheduleId, deliveryState: { $ne: "sent" } })
  );
  if (!result) throw new NotFoundError("Scheduled email not found");
}

async function updateScheduleTerminalStatus(scheduleId: mongoose.Types.ObjectId) {
  const remaining = await ScheduledEmail.countDocuments({
    scheduleId,
    deliveryState: { $in: ACTIVE_DELIVERY_STATES },
  });
  if (remaining === 0) {
    const total = await ScheduledEmail.countDocuments({ scheduleId });
    await Schedule.updateOne(
      { _id: scheduleId },
      { $set: { status: total === 0 ? "expired" : "sent" } }
    );
  }
}

async function generateForScheduledEmail(email: IScheduledEmail): Promise<void> {
  if (!email.prompt || !email.category || !email.modelId) {
    throw new Error("Scheduled email is missing generation metadata.");
  }
  const provider = getAIProvider();
  let profileContext;
  try {
    const profile = await getProfile(email.userId);
    profileContext = buildProfileContext(profile, email.category as EmailCategory, email.prompt);
  } catch {
    profileContext = undefined;
  }
  const response = await provider.complete({
    prompt: email.prompt,
    category: email.category,
    config: { modelId: email.modelId },
    profileContext: profileContext ?? undefined,
  });
  const parsed = parseEmailContent(response.content);
  email.subject = parsed.subject || email.subject || "";
  email.body = parsed.body;
  email.modelId = email.modelId;
  email.errorCode = undefined;
  email.errorMessage = undefined;
  await recordAudit({
    action: "email.generated",
    entityType: "ScheduledEmail",
    entityId: email._id.toString(),
    userId: email.userId,
    metadata: { modelUsed: response.modelUsed, source: "schedule" },
  });
}

async function processScheduleItems(
  schedule: ISchedule,
  result: ProcessSchedulesResult,
  maxEmailsPerSchedule: number,
  delayBetweenItemsMs: number
) {
  result.schedulesChecked++;
  const candidates = await ScheduledEmail.find({
    scheduleId: schedule._id,
    deliveryState: { $in: PROCESSABLE_DELIVERY_STATES },
  })
    .sort({ sortOrder: 1 })
    .limit(maxEmailsPerSchedule)
    .select("_id");

  if (candidates.length === 0) {
    await updateScheduleTerminalStatus(schedule._id);
    return;
  }

  for (let i = 0; i < candidates.length; i++) {
    if (i > 0 && delayBetweenItemsMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenItemsMs));
    }

    const candidate = candidates[i];
    const email = await ScheduledEmail.findOneAndUpdate(
      {
        _id: candidate._id,
        deliveryState: { $in: PROCESSABLE_DELIVERY_STATES },
      },
      {
        $set: {
          deliveryState: "sending",
          claimedAt: new Date(),
          errorCode: undefined,
          errorMessage: undefined,
        },
      },
      { returnDocument: "after" }
    );
    if (!email) continue;

    result.itemsProcessed++;
    try {
      if (!email.subject || !email.body) {
        await generateForScheduledEmail(email);
        result.generated++;
      }
      if (!email.subject || !email.body) {
        throw new Error("Generated email is missing subject or body.");
      }
      const sendResult = await dispatchSendEmail({
        userId: email.userId,
        to: email.to,
        subject: email.subject,
        body: email.body,
        rateLimitKey: `send-email:${email.userId}`,
        rateLimit: { maxRequests: 5, windowMs: 60_000 },
      });

      if (sendResult.ok) {
        email.deliveryState = "sent";
        email.sentAt = new Date();
        email.errorCode = undefined;
        email.errorMessage = undefined;
        await email.save();
        result.sent++;
        await recordAudit({
          action: "schedule.email_sent",
          entityType: "ScheduledEmail",
          entityId: email._id.toString(),
          userId: email.userId,
          metadata: { scheduleId: schedule._id.toString(), to: email.to },
        });
      } else {
        email.deliveryState = "failed";
        email.errorCode = sendResult.code;
        email.errorMessage = sendResult.message;
        await email.save();
        result.failed++;
        await recordAudit({
          action: "schedule.email_failed",
          entityType: "ScheduledEmail",
          entityId: email._id.toString(),
          userId: email.userId,
          metadata: { scheduleId: schedule._id.toString(), code: sendResult.code },
        });
      }
    } catch (error) {
      email.deliveryState = "failed";
      email.errorCode = "SCHEDULE_PROCESSING_FAILED";
      email.errorMessage = error instanceof Error ? error.message : "Scheduled send failed";
      await email.save();
      result.failed++;
    }
  }

  await updateScheduleTerminalStatus(schedule._id);
}

function createProcessResult(): ProcessSchedulesResult {
  return {
    schedulesChecked: 0,
    itemsProcessed: 0,
    sent: 0,
    failed: 0,
    generated: 0,
  };
}

export async function processDueSchedules(
  input: ProcessSchedulesInput
): Promise<ProcessSchedulesResult> {
  await connectDB();
  const result = createProcessResult();

  const schedules = await Schedule.find({
    status: "active",
    scheduledAt: { $lte: new Date() },
  })
    .sort({ scheduledAt: 1 })
    .limit(input.maxSchedules);

  for (const schedule of schedules) {
    await processScheduleItems(schedule, result, input.maxEmailsPerSchedule, 12_000);
  }

  return result;
}

export async function processUserScheduleNow(
  scheduleId: string,
  userId: string
): Promise<ProcessSchedulesResult> {
  await connectDB();
  const result = createProcessResult();
  const schedule = await getScheduleOrThrow(scheduleId, userId);

  if (schedule.status !== "active" || schedule.scheduledAt > new Date()) {
    return result;
  }

  await processScheduleItems(schedule, result, 1, 0);
  return result;
}

// ============================================================
// FILE: src/modules/schedule/service.ts
// ============================================================
// PURPOSE: Manages scheduled email campaigns — create schedules, add emails to them, and the cron job that actually sends them on time.
// HOW IT WORKS: Two main parts:
//   USER-FACING (CRUD): createSchedule() makes a schedule with name, date, timezone. addScheduledEmails() adds emails (single or from batch) with deduplication (won't add the same batch entry twice). listSchedules() returns paginated list with counts (total/sent/failed/pending). getSchedule() returns full detail with all emails. updateSchedule() changes name/date/timezone/status. deleteSchedule() cancels and removes unsent emails.
//   CRON PROCESSOR (runs automatically): processDueSchedules() finds all active schedules whose time has come. For each, claims up to N emails atomically (prevents double-send if cron runs twice), generates missing content via AI if needed, sends via dispatchSendEmail() with rate limiting, marks each email sent/failed, updates schedule status to "sent" or "expired" when done. processUserScheduleNow() lets a user trigger their schedule immediately (for testing).
//   Delivery state machine: awaiting_content -> (AI generates) -> ready -> (sending) -> sent OR failed. "sending" state prevents duplicates.
// INTEGRATION: Schedule/ScheduledEmail/BulkEntry models; AI provider factory; profile context builder; email parsing (content.ts) and dispatch (dispatch.ts); audit logging; auth ownership. Cron route: src/app/api/cron/process-schedules/route.ts.
// ============================================================
