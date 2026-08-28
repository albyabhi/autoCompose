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
// PURPOSE: Manages the connection to the MongoDB database so the app can store and retrieve data.
// HOW IT WORKS: Instead of opening a new database connection every time the code needs to read or write data (which would be slow and exhaust database resources), this module keeps a single shared connection alive for the entire lifetime of the server process. The first time connectDB() is called, it opens the connection using settings from config (connection pool size, timeouts). Subsequent calls return the same connection instantly. The connection survives Next.js hot reloads during development because it's stored in a global variable. disconnectDB() is available for graceful shutdown.
// INTEGRATION: Reads MongoDB URI and options from src/config/index.ts; uses Mongoose (the MongoDB library); called by virtually every service module (email, schedule, profile, session, Telegram, bulk, resume) and audit logging before they query the database.
// ============================================================
