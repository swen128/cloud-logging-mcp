import { z } from "zod";
import type { CloudLoggingApi } from "../domain/api";
import type { LogCache } from "../domain/cache";
import { createLogId } from "../domain/log-id";
import {
  buildLogFilter,
  formatLogEntry,
  formatError,
  formatNotFoundError,
} from "../domain/get-log-detail";
import type { Tool } from "./types";

const inputSchema = z.object({
  projectId: z.string().describe("Google Cloud project ID"),
  logId: z.string(),
});

type GetLogDetailInput = z.infer<typeof inputSchema>;

export const getLogDetailTool = (dependencies: {
  api: CloudLoggingApi;
  cache: LogCache;
}): Tool<typeof inputSchema> => {
  return {
    name: "getLogDetail",
    description: "Returns the whole record of a log with the given ID",
    inputSchema: inputSchema,
    handler: async ({ input }: { input: GetLogDetailInput }): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      const projectId = input.projectId;

      // First check cache
      const logIdTyped = createLogId(input.logId);
      const cachedEntry = dependencies.cache.get(logIdTyped);
      if (cachedEntry) {
        return {
          content: [
            {
              type: "text" as const,
              text: formatLogEntry(cachedEntry),
            },
          ],
        };
      }

      // If not in cache, query from API
      const filter = buildLogFilter(input.logId);
      const result = await dependencies.api.entries({
        projectId,
        filter,
        pageSize: 1,
      });

      if (result.isErr()) {
        return {
          content: [
            {
              type: "text" as const,
              text: formatError(result.error),
            },
          ],
        };
      }

      const entries = result.value.entries;
      if (entries.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: formatNotFoundError(input.logId),
            },
          ],
        };
      }

      const entry = entries[0];
      
      if (entry === undefined) {
        return {
          content: [
            {
              type: "text" as const,
              text: formatNotFoundError(input.logId),
            },
          ],
        };
      }
      
      // Add to cache for future requests
      dependencies.cache.add(logIdTyped, entry);

      return {
        content: [
          {
            type: "text" as const,
            text: formatLogEntry(entry),
          },
        ],
      };
    },
  };
};

