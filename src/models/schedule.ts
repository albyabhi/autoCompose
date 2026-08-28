import mongoose, { Schema, Document } from "mongoose";

export type ScheduleStatus = "active" | "sent" | "expired" | "cancelled";

export interface ISchedule extends Document {
  userId: string;
  name: string;
  scheduledAt: Date;
  timezone: string;
  status: ScheduleStatus;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Schedule name is required"],
      maxlength: [120, "Schedule name cannot exceed 120 characters"],
    },
    scheduledAt: {
      type: Date,
      required: [true, "Scheduled time is required"],
      index: true,
    },
    timezone: {
      type: String,
      required: [true, "Timezone is required"],
      default: "UTC",
      maxlength: [80, "Timezone cannot exceed 80 characters"],
    },
    status: {
      type: String,
      enum: ["active", "sent", "expired", "cancelled"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

scheduleSchema.index({ userId: 1, status: 1, scheduledAt: 1 });

export const Schedule =
  mongoose.models.Schedule ??
  mongoose.model<ISchedule>("Schedule", scheduleSchema);

// ============================================================
// FILE: src/models/schedule.ts
// ============================================================
// PURPOSE: A named, timed email campaign — "Send these emails at this date/time in this timezone."
// HOW IT WORKS: Mongoose schema for the Schedule collection. Each schedule is a container for multiple ScheduledEmail documents.
//   - userId: Owner (indexed).
//   - name: Display name (e.g., "Weekly Team Updates"). Max 120 chars.
//   - scheduledAt: Exact UTC Date when the cron processor should start sending.
//   - timezone: User's IANA timezone (e.g., "America/New_York") for display — stored so the UI can show the schedule in their local time.
//   - status: "active" (waiting for scheduledAt), "sent" (all emails sent), "expired" (time passed, no emails), "cancelled" (user cancelled). Indexed for cron queries.
//   Compound index on userId+status+scheduledAt optimizes listing and cron lookup (find active due schedules).
// FIELDS: userId, name, scheduledAt, timezone, status, createdAt, updatedAt.
// INTEGRATION: Schedule service (CRUD + cron processor), ScheduledEmail model (child emails), schedule API routes, cron route (src/app/api/cron/process-schedules/route.ts).
// ============================================================
