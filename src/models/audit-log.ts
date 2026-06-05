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
  | "session.archived"
  | "session.unarchived";

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
