import type { RawLogEntry } from "./api";
import { getLogIdValue } from "./log-id";
import { summarize } from "./log-entry";

interface LogSummary {
  id: string;
  summary: string;
}

export function transformLogEntries(
  entries: RawLogEntry[],
  summaryFields?: string[]
): LogSummary[] {
  return entries.map((entry) => ({
    id: getLogIdValue(entry.insertId),
    summary: summarize(entry, summaryFields).summary,
  }));
}

interface QueryLogsOutput {
  logs: LogSummary[];
  pageSize: number;
  nextPageToken?: string;
}

export function createQueryLogsOutput(
  entries: RawLogEntry[],
  nextPageToken: string | undefined,
  summaryFields?: string[]
): QueryLogsOutput {
  return {
    logs: transformLogEntries(entries, summaryFields),
    pageSize: entries.length,
    nextPageToken,
  };
}