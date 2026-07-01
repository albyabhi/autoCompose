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
// PURPOSE: Mongoose schema for named future email schedules.
// HOW IT WORKS: Each schedule belongs to one user, stores a display name,
//   an absolute UTC Date for processing, and the browser timezone used for
//   display. Status controls whether cron may process the schedule, with
//   indexes optimized for active due-schedule lookup and user listing.
// INTEGRATION: Used by schedule service, schedule API routes, and cron processor.
// ============================================================
