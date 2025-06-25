import { z } from "zod";
import type { CloudLoggingApi } from "../domain/api";
import type { LogCache } from "../domain/cache";
import { createQueryLogsOutput } from "../domain/query-logs";

const inputSchema = z.object({
  projectId: z.string().optional().describe("Google Cloud project ID. If not provided, uses the default project from gcloud config"),
  filter: z.string(),
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

type QueryLogsInput = z.infer<typeof inputSchema>;

export const queryLogsTool = (dependencies: {
  api: CloudLoggingApi;
  cache: LogCache;
}): Tool<typeof inputSchema> => {
  return {
    name: "queryLogs",
    description: "Returns a list of log summaries based on the given query",
    inputSchema: inputSchema,
    handler: async ({ input }: { input: QueryLogsInput }): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
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

      // Call the Cloud Logging API to get entries
      const result = await dependencies.api.entries({
        projectId,
        filter: input.filter,
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
