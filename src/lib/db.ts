import mongoose from "mongoose";
import { getConfig } from "@/config";
import { logger } from "./logger";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.__mongooseCache ?? { conn: null, promise: null };

if (!global.__mongooseCache) {
  global.__mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    logger.debug("Using existing MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const cfg = getConfig();
    logger.info("Connecting to MongoDB...", { uri: cfg.mongodb.uri.replace(/\/\/.*@/, "//***:***@") });

    cached.promise = mongoose.connect(cfg.mongodb.uri, cfg.mongodb.options).then((m) => {
      logger.info("MongoDB connected successfully");
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    logger.error("MongoDB connection failed", error instanceof Error ? { message: error.message } : error);
    throw error;
  }

  return cached.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    logger.info("MongoDB disconnected");
  }
}

// ============================================================
// FILE: src/lib/db.ts
// ============================================================
// PURPOSE: Provides a cached MongoDB connection singleton using Mongoose.
// HOW IT WORKS: Maintains a global cache (survives hot reloads) so only one
//   connection is opened per process. connectDB() returns the existing
//   connection if available, otherwise creates a new one with configured
//   pool sizes and timeouts. disconnectDB() cleanly tears down the connection.
// INTEGRATION: MongoDB via Mongoose, reads config from src/config/index.ts
// ============================================================
