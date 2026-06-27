import mongoose, { Schema, Document } from "mongoose";

export type AuditAction =
  | "email.generated"
  | "email.regenerated"
  | "model.switched"
  | "api.error"
  | "validation.error"
  | "auth.login"
  | "auth.logout"
  | "auth.signup"
  | "auth.failed_login"
  | "auth.session_refresh"
  | "session.created"
  | "session.updated"
  | "session.deleted"
  | "session.bulk_deleted"
  | "session.archived"
  | "session.unarchived"
  | "email.sent"
  | "email.send_failed"
  | "email.credentials_saved"
  | "email.credentials_removed"
  | "email.credentials_migrated_to_v2"
  | "telegram.linked"
  | "telegram.unlinked"
  | "telegram.login_code_generated"
  | "telegram.login_code_attempt"
  | "telegram.message_received"
  | "telegram.command_executed"
  | "telegram.email_generated"
  | "telegram.email_sent"
  | "telegram.email_send_failed"
  | "telegram.webhook_rejected";

export interface IAuditLog extends Document {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  userId?: string;
  metadata: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: [true, "Action is required"],
      index: true,
    },
    entityType: {
      type: String,
      index: true,
    },
    entityId: {
      type: String,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip: String,
    userAgent: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

export const AuditLog =
  mongoose.models.AuditLog ??
  mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

// ============================================================
// FILE: src/models/audit-log.ts
// ============================================================
// PURPOSE: Mongoose schema for immutable audit trail of significant application events.
// HOW IT WORKS: Stores action type (from 32 predefined actions), entity reference,
//   user ID, metadata, IP, and user agent. Only createdAt is tracked (no updatedAt).
//   Indexes on action, userId, and createdAt enable efficient querying for
//   monitoring, debugging, and compliance. Actions cover email generation/sending,
//   auth events, session management, and Telegram interactions.
// FIELDS: action, entityType, entityId, userId, metadata, ip, userAgent, createdAt
// INTEGRATION: Written by audit.ts recordAudit(), queried for monitoring/debugging
// ============================================================
