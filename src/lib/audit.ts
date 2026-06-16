import { connectDB } from "./db";
import { AuditLog, AuditAction } from "@/models/audit-log";
import { logger } from "./logger";

interface AuditEntry {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: {
        ...entry.metadata,
        userId: entry.userId,
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
      ip: entry.ip,
      userAgent: entry.userAgent,
    });
    logger.info(`Audit: ${entry.action}`, {
      entityType: entry.entityType,
      entityId: entry.entityId,
      userId: entry.userId,
    });
  } catch (error) {
    logger.error("Failed to record audit log", error instanceof Error ? { message: error.message } : error);
  }
}

// ============================================================
// FILE: src/lib/audit.ts
// ============================================================
// PURPOSE: Records audit trail entries for significant user actions.
// HOW IT WORKS: recordAudit() takes an action type, entity info, and metadata,
//   then creates an AuditLog document in MongoDB. It also logs the event via
//   the logger. Failures are caught and logged but do not propagate - audit
//   logging is fire-and-forget to avoid disrupting the main operation.
// INTEGRATION: MongoDB (AuditLog model), used by email, session, auth, and
//   Telegram modules to track email generation, sending, and auth events
// ============================================================
