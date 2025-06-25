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

const inputSchema = z.object({
  projectId: z.string().optional().describe("Google Cloud project ID. If not provided, uses the default project from gcloud config"),
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
      const projectId = input.projectId ?? await dependencies.api.getDefaultProjectId();
      
      if (projectId === undefined || projectId === '') {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: No project ID provided and unable to detect default project. Please specify a project ID or ensure you're authenticated with gcloud.",
            },
          ],
        };
      }

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

// TODO: This type is shared between the tools. Consider moving it to a common location.
type Tool<InputSchema extends z.ZodTypeAny> = {
  name: string;
  description: string;
  inputSchema: InputSchema;
  handler: (args: { input: z.infer<InputSchema> }) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
};
