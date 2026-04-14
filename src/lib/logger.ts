/**
 * Structured JSON logger.
 *
 * Outputs one JSON line per event — parseable by Azure Monitor,
 * Application Insights, or any log aggregator.
 *
 * Usage:
 *   logger.info("User logged in", { userId, ip });
 *   logger.warn("Rate limit hit", { ip, endpoint: "/api/auth/login" });
 *   logger.error("Statement store failed", { statementId, error: e });
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  // Serialize errors into readable format
  if (entry.error instanceof Error) {
    entry.error = {
      name: entry.error.name,
      message: entry.error.message,
      stack: entry.error.stack,
    };
  }

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => emit("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit("error", message, meta),
};
