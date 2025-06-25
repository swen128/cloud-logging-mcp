import { z } from "zod";
import type { CloudLoggingApi } from "../domain/api.js";
import type { ListProjectsOutput } from "../domain/list-projects.js";

const ListProjectsInputSchema = z.object({
  filter: z.string().optional().describe("Optional filter to apply to the project list"),
  pageSize: z.number().optional().describe("Number of projects to return (default: 100)"),
  pageToken: z.string().optional().describe("Page token for pagination"),
});

type Tool<InputSchema extends z.ZodTypeAny> = {
  name: string;
  description: string;
  inputSchema: InputSchema;
  handler: (args: { input: z.infer<InputSchema> }) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
};

export const listProjects = (api: CloudLoggingApi): Tool<typeof ListProjectsInputSchema> => {
  return {
    name: "listProjects",
    description: "Lists available Google Cloud projects that the authenticated user has access to",
    inputSchema: ListProjectsInputSchema,
    handler: async ({ input }): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      try {
        const result: ListProjectsOutput = await api.listProjects(input);
        const { projects, nextPageToken } = result;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  projects: projects.map((p) => ({
                    projectId: p.projectId,
                    displayName: p.displayName ?? p.name,
                    state: p.state,
                  })),
                  nextPageToken,
                  totalCount: projects.length,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing projects: ${errorMessage}`,
            },
          ],
        };
      }
    },
  };
};