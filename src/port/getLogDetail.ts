import { z } from "zod";
import type { CloudLoggingApi } from "../domain/api";
import type { LogCache } from "../domain/cache";
import { getLogDetail } from "../domain/get-log-detail";

const inputSchema = z.object({
  projectId: z.string().optional().describe("Google Cloud project ID. If not provided, uses the default project from gcloud config"),
  logId: z.string(),
});

export type GetLogDetailInput = z.infer<typeof inputSchema>;

export const getLogDetailTool = (dependencies: {
  api: CloudLoggingApi;
  cache: LogCache;
}): Tool<typeof inputSchema> => {
  return {
    name: "getLogDetail",
    description: "Returns the whole record of a log with the given ID",
    inputSchema: inputSchema,
    handler: async ({ input }: { input: GetLogDetailInput }) => {
      let projectId = input.projectId;
      
      if (!projectId) {
        projectId = await dependencies.api.getDefaultProjectId();
        if (!projectId) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: No project ID provided and unable to detect default project. Please specify a project ID or ensure you're authenticated with gcloud.",
              },
            ],
          };
        }
      }

      const result = await getLogDetail(dependencies)({ ...input, projectId });
      return {
        content: [
          {
            type: "text" as const,
            text: result,
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
