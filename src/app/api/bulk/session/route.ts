import { NextRequest } from "next/server";
import { created, failure } from "@/utils/api-response";
import { requireAuth } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { Session } from "@/models/session";
import { recordAudit } from "@/lib/audit";

export async function POST(_request: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const count = await Session.countDocuments({
      userId: user.userId,
      type: "batch",
      isDeleted: false,
    });

    const session = await Session.create({
      title: `Batch ${count + 1}`,
      category: "custom",
      type: "batch",
      userId: user.userId,
      metadata: {},
    });

    recordAudit({
      action: "session.created",
      entityType: "Session",
      entityId: session._id.toString(),
      userId: user.userId,
      metadata: { title: session.title, type: "batch" },
    });

    return created({
      id: session._id.toString(),
      title: session.title,
    });
  } catch (error) {
    return failure(error);
  }
}
