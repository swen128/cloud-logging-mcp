import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { GoogleCloudLoggingApiClient } from "./adapter/api";
import { LogCacheImpl } from "./adapter/cache";
import { createTools } from "./port";

export const createServer = (): Server => {
  const server = new Server(
    {
      name: "Google Cloud Logging MCP",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const api = new GoogleCloudLoggingApiClient(process.env.GOOGLE_CLOUD_PROJECT);
  const cache = new LogCacheImpl();
  const { queryLogs, getLogDetail, listProjects } = createTools({ api, cache });

  // Handle tools/list request
  server.setRequestHandler(
    z.object({
      method: z.literal("tools/list"),
    }),
    (): { tools: Array<{ name: string; description: string; inputSchema: unknown }> } => ({
      tools: [
        {
          name: queryLogs.name,
          description: queryLogs.description,
          inputSchema: zodToJsonSchema(queryLogs.inputSchema),
        },
        {
          name: getLogDetail.name,
          description: getLogDetail.description,
          inputSchema: zodToJsonSchema(getLogDetail.inputSchema),
        },
        {
          name: listProjects.name,
          description: listProjects.description,
          inputSchema: zodToJsonSchema(listProjects.inputSchema),
        },
      ],
    }),
  );

  // Handle tools/call request
  server.setRequestHandler(
    z.object({
      method: z.literal("tools/call"),
      params: z.object({
        name: z.string(),
        arguments: z.unknown().optional(),
      }),
    }),
    async (request): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "queryLogs": {
            const validatedInput = queryLogs.inputSchema.safeParse(args ?? {});
            if (!validatedInput.success) {
              return {
                isError: true,
                content: [
                  {
                    type: "text" as const,
                    text: `Invalid input for tool ${name}: ${validatedInput.error.message}`,
                  },
                ],
              };
            }
            return await queryLogs.handler({ input: validatedInput.data });
          }
          case "getLogDetail": {
            const validatedInput = getLogDetail.inputSchema.safeParse(args ?? {});
            if (!validatedInput.success) {
              return {
                isError: true,
                content: [
                  {
                    type: "text" as const,
                    text: `Invalid input for tool ${name}: ${validatedInput.error.message}`,
                  },
                ],
              };
            }
            return await getLogDetail.handler({ input: validatedInput.data });
          }
          case "listProjects": {
            const validatedInput = listProjects.inputSchema.safeParse(args ?? {});
            if (!validatedInput.success) {
              return {
                isError: true,
                content: [
                  {
                    type: "text" as const,
                    text: `Invalid input for tool ${name}: ${validatedInput.error.message}`,
                  },
                ],
              };
            }
            return await listProjects.handler({ input: validatedInput.data });
          }
          default:
            return {
              isError: true,
              content: [
                {
                  type: "text" as const,
                  text: `Unknown tool: ${name}`,
                },
              ],
            };
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  return server;
};