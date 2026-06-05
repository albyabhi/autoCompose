type LogLevel = "debug" | "info" | "warn" | "error";

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[currentLevel];
}

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, meta));
    }
  },
  info(message: string, meta?: unknown) {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, meta));
    }
  },
  warn(message: string, meta?: unknown) {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, meta));
    }
  },
  error(message: string, meta?: unknown) {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, meta));
    }
  },
};
