import { type Result, err, ok } from "neverthrow";
import type { CloudLoggingApi, CloudLoggingError, RawLogEntry, CloudLoggingQuery } from "./api";
import type { LogCache } from "./cache";
import { summarize } from "./log-entry";

/**
 * Output type for the queryLogs function
 */
export type QueryLogsResult = {
  logs: Array<{
    id: string;
    summary: string;
  }>;
  pageSize: number;
  nextPageToken?: string;
};

/**
 * Query logs from Cloud Logging
 * @param dependencies The dependencies (api and cache)
 * @returns A function that takes input parameters and returns a Result with logs and pagination info
 */
export const queryLogs =
  (dependencies: {
    api: CloudLoggingApi;
    cache: LogCache;
  }) =>
  async (input: CloudLoggingQuery): Promise<Result<QueryLogsResult, CloudLoggingError>> => {
    const { api, cache } = dependencies;

    // Call the Cloud Logging API to get entries
    const result = await api.entries(input);

    if (result.isErr()) {
      return err(result.error);
    }

    const { entries, nextPageToken } = result.value;

    // Cache each log entry
    for (const entry of entries) {
      if (entry.insertId) {
        cache.add(entry.insertId, entry);
      }
    }

    // Transform entries to the expected output format
    const logs = entries.map((entry: RawLogEntry) => ({
      id: entry.insertId,
      summary: summarize(entry, input.summaryFields).summary,
    }));

    return ok({
      logs,
      pageSize: entries.length,
      nextPageToken,
    });
  };
