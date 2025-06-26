import { z } from "zod";
import type { CloudLoggingApi } from "../domain/api";
import type { LogCache } from "../domain/cache";
import { createQueryLogsOutput } from "../domain/query-logs";
import { buildQueryLogsFilter } from "../domain/query-logs-filter";
import type { Tool } from "./types";

export const queryLogsInputSchema = z.object({
  projectId: z.string().describe("Google Cloud project ID"),
  filter: z.string(),
  startTime: z
    .string()
    .optional()
    .describe("Start time in ISO 8601 format (e.g., '2024-01-01T00:00:00Z')"),
  endTime: z
    .string()
    .optional()
    .describe("End time in ISO 8601 format (e.g., '2024-01-01T23:59:59Z')"),
  resourceNames: z
    .array(
      z.string({
        description: "e.g. 'projects/<project_id>/logs/run.googleapis.com%2Fstdout'",
      }),
    )
    .optional(),
  pageSize: z.number().optional(),
  pageToken: z.string().optional(),
  orderBy: z
    .object({
      timestamp: z.enum(["asc", "desc"]),
    })
    .optional(),
  summaryFields: z
    .array(
      z.string({
        description: "Fields to include in the summary, e.g. ['labels.service', 'textPayload']",
      }),
    )
    .optional(),
});

type QueryLogsInput = z.infer<typeof queryLogsInputSchema>;

export const queryLogsTool = (dependencies: {
  api: CloudLoggingApi;
  cache: LogCache;
}): Tool<typeof queryLogsInputSchema> => {
  return {
    name: "queryLogs",
    description:
      "Query Google Cloud logs with optional time range. Time filters: use startTime/endTime with ISO 8601 format (e.g., '2024-01-01T00:00:00Z'). Filters are combined with AND.",
    inputSchema: queryLogsInputSchema,
    handler: async ({
      input,
    }: {
      input: QueryLogsInput;
    }): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      const projectId = input.projectId;

      try {
        const filterResult = buildQueryLogsFilter(input);
        if (filterResult.isErr()) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: ${filterResult.error.message}`,
              },
            ],
          };
        }
        // Call the Cloud Logging API to get entries
        const result = await dependencies.api.entries({
          projectId,
          filter: filterResult.value,
          resourceNames: input.resourceNames,
          pageSize: input.pageSize,
          pageToken: input.pageToken,
          orderBy: input.orderBy,
        });

        if (result.isErr()) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error querying logs: ${result.error.message}`,
              },
            ],
          };
        }

        const { entries, nextPageToken } = result.value;

        // Cache each log entry
        for (const entry of entries) {
          dependencies.cache.add(entry.insertId, entry);
        }

        // Transform entries to the expected output format
        const output = createQueryLogsOutput(entries, nextPageToken, input.summaryFields);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  };
};
