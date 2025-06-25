import type { CloudLoggingError, RawLogEntry } from "./api";

export function buildLogFilter(logId: string): string {
  return `insertId="${logId}"`;
}

export function formatLogEntry(entry: RawLogEntry): string {
  return JSON.stringify(entry, null, 2);
}

export function formatError(error: CloudLoggingError): string {
  return JSON.stringify({
    error: error.message,
    code: error.code,
  }, null, 2);
}

export function formatNotFoundError(logId: string): string {
  return JSON.stringify({
    error: "Log entry not found",
    logId,
  }, null, 2);
}