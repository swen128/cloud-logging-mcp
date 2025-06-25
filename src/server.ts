import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { createCloudLoggingTools } from "./index";

export const createServer = () => {
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

  const { queryLogs, getLogDetail, listProjects } = createCloudLoggingTools({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });

  // Handle tools/list request
  server.setRequestHandler(
    z.object({
      method: z.literal("tools/list"),
    }),
    async () => ({
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
        arguments: z.any().optional(),
      }),
    }),
    async (request) => {
      const { name, arguments: args } = request.params;

      const tools = { queryLogs, getLogDetail, listProjects };
      const tool = Object.values(tools).find((t) => t.name === name);

      if (!tool) {
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

      try {
        const result = await tool.handler({ input: args || {} });
        return result;
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