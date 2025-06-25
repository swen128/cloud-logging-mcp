import type { CloudLoggingApi } from "./api";
import type { LogCache } from "./cache";
import { createLogId } from "./log-id";

interface GetLogDetailInput {
  projectId: string;
  logId: string;
}

export const getLogDetail =
  (dependencies: {
    api: CloudLoggingApi;
    cache: LogCache;
  }) =>
  async (input: GetLogDetailInput): Promise<string> => {
    const { api, cache } = dependencies;
    const { projectId, logId } = input;

    // First check cache
    const logIdTyped = createLogId(logId);
    const cachedEntry = cache.get(logIdTyped);
    if (cachedEntry) {
      return JSON.stringify(cachedEntry, null, 2);
    }

    // If not in cache, query from API
    const filter = `insertId="${logId}"`;
    const result = await api.entries({
      projectId,
      filter,
      pageSize: 1,
    });

    if (result.isErr()) {
      return JSON.stringify({
        error: result.error.message,
        code: result.error.code,
      }, null, 2);
    }

    const entries = result.value.entries;
    if (entries.length === 0) {
      return JSON.stringify({
        error: "Log entry not found",
        logId,
      }, null, 2);
    }

    const entry = entries[0];
    
    // Add to cache for future requests
    if (entry !== undefined) {
      cache.add(logIdTyped, entry);
    }

    return JSON.stringify(entry, null, 2);
  };
