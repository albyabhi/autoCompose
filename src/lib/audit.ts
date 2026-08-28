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
// PURPOSE: Creates a permanent, tamper-evident log of important user actions for security and debugging.
// HOW IT WORKS: When something important happens (email generated, sent, schedule created, user logged in, Telegram bot used), the code calls recordAudit() with an action name (like "email.generated"), what entity was affected (like "EmailTemplate" with its ID), and extra context (which AI model, which user, IP address). This creates an AuditLog document in MongoDB that can never be modified — only appended. If the database is temporarily unavailable, the error is logged but the main operation continues uninterrupted (fire-and-forget).
//   Common actions tracked: email.generated, email.sent, schedule.created, schedule.email_sent, schedule.email_failed, telegram.message_received, email.credentials_saved, email.credentials_migrated_to_v2.
// INTEGRATION: MongoDB via AuditLog model (src/models/audit-log.ts); uses connectDB (src/lib/db.ts) and logger (src/lib/logger.ts); called from email service (src/modules/email/service.ts), schedule service (src/modules/schedule/service.ts), profile service (src/modules/profile/service.ts), Telegram webhook (src/modules/telegram/webhook.ts), and session service (src/modules/session/service.ts).
// ============================================================
