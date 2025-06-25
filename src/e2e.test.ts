import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { spawn, type ChildProcess } from "child_process";
import { createInterface } from "readline";
import { z } from "zod";

const MCPResponseSchema = z.object({
  id: z.number().optional(),
  result: z.unknown().optional(),
  error: z.unknown().optional(),
  jsonrpc: z.string(),
});

type MCPResponse = z.infer<typeof MCPResponseSchema>;

// Schema for init response
const InitResponseSchema = z.object({
  serverInfo: z.object({
    name: z.string(),
    version: z.string(),
  }),
  capabilities: z.object({
    tools: z.object({}).optional(),
  }),
  protocolVersion: z.string(),
});

// Schema for tools list response
const ToolsListResponseSchema = z.object({
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    inputSchema: z.object({
      type: z.string(),
      required: z.array(z.string()).optional(),
      properties: z.record(z.unknown()).optional(),
    }),
  })),
});

// Schema for tool call response
const ToolCallResponseSchema = z.object({
  content: z.array(z.object({
    type: z.string(),
    text: z.string(),
  })),
  isError: z.boolean().optional(),
});

interface MCPRequest {
  jsonrpc: string;
  id?: number;
  method: string;
  params?: unknown;
}

// Skip e2e tests unless RUN_E2E is set
const skipE2E = process.env.RUN_E2E !== '1';

describe.skipIf(skipE2E)("MCP Server E2E Tests", () => {
  let serverProcess: ChildProcess;
  let sendRequest: (request: MCPRequest) => void;
  let waitForResponse: (id: number, timeout?: number) => Promise<MCPResponse>;
  const responses = new Map<number, MCPResponse>();

  beforeAll(async () => {
    // Start the MCP server
    serverProcess = spawn("bun", ["run", "src/main.ts"], {
      env: { ...process.env, GOOGLE_CLOUD_PROJECT: "test-project" },
    });

    if (!serverProcess.stdout) {
      throw new Error("Server process stdout is not available");
    }
    
    const rl = createInterface({
      input: serverProcess.stdout,
      terminal: false,
    });

    // Collect responses
    rl.on("line", (line) => {
      try {
        const parsed: unknown = JSON.parse(line);
        const parseResult = MCPResponseSchema.safeParse(parsed);
        if (parseResult.success && parseResult.data.id !== undefined) {
          responses.set(parseResult.data.id, parseResult.data);
        }
      } catch (e) {
        // Ignore non-JSON output
      }
    });

    // Helper to send requests
    sendRequest = (request: MCPRequest): void => {
      if (!serverProcess.stdin) {
        throw new Error("Server process stdin is not available");
      }
      serverProcess.stdin.write(JSON.stringify(request) + "\n");
    };

    // Helper to wait for response
    waitForResponse = (id: number, timeout = 5000): Promise<MCPResponse> => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if (responses.has(id)) {
            clearInterval(checkInterval);
            const response = responses.get(id);
            if (response) {
              resolve(response);
            } else {
              reject(new Error(`Response ${id} not found`));
            }
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            reject(new Error(`Timeout waiting for response with id ${id}`));
          }
        }, 10);
      });
    };

    // Initialize the server
    sendRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "1.0.0",
        },
      },
    });

    const initResponse = await waitForResponse(1);
    expect(initResponse.result).toBeDefined();
    const initResult = InitResponseSchema.safeParse(initResponse.result);
    if (!initResult.success) {
      throw new Error(`Invalid init response: ${initResult.error.message}`);
    }
    expect(initResult.data.serverInfo.name).toBe("Google Cloud Logging MCP");

    // Send initialized notification
    sendRequest({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    // Give server time to process
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(() => {
    if (serverProcess !== undefined) {
      serverProcess.kill();
    }
  });

  it("should return server capabilities on initialization", () => {
    const initResponse = responses.get(1);
    expect(initResponse).toBeDefined();
    if (!initResponse) {
      throw new Error("Init response not found");
    }
    const initResult = InitResponseSchema.safeParse(initResponse.result);
    if (!initResult.success) {
      throw new Error(`Invalid init response: ${initResult.error.message}`);
    }
    expect(initResult.data.capabilities).toEqual({
      tools: {},
    });
    expect(initResult.data.protocolVersion).toBe("2024-11-05");
  });

  it("should list available tools", async () => {
    sendRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });

    const response = await waitForResponse(2);
    expect(response.result).toBeDefined();
    const toolsResult = ToolsListResponseSchema.safeParse(response.result);
    if (!toolsResult.success) {
      throw new Error(`Invalid tools list response: ${toolsResult.error.message}`);
    }
    expect(toolsResult.data.tools).toHaveLength(3);

    const toolNames = toolsResult.data.tools.map((t) => t.name);
    expect(toolNames).toContain("queryLogs");
    expect(toolNames).toContain("getLogDetail");
    expect(toolNames).toContain("listProjects");

    // Check tool schemas
    const queryLogsTool = toolsResult.data.tools.find((t) => t.name === "queryLogs");
    expect(queryLogsTool).toBeDefined();
    expect(queryLogsTool).toBeDefined();
    if (!queryLogsTool) {
      throw new Error("queryLogs tool not found");
    }
    expect(queryLogsTool.inputSchema.type).toBe("object");
    expect(queryLogsTool.inputSchema.required).toContain("filter");
    const filterProp = queryLogsTool.inputSchema.properties?.filter;
    if (typeof filterProp === 'object' && filterProp !== null && 'type' in filterProp) {
      expect(filterProp.type).toBe("string");
    }
  });

  it("should handle tools/call for listProjects", async () => {
    sendRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "listProjects",
        arguments: {
          pageSize: 10,
        },
      },
    });

    const response = await waitForResponse(3);
    expect(response.result).toBeDefined();
    const callResult = ToolCallResponseSchema.safeParse(response.result);
    if (!callResult.success) {
      throw new Error(`Invalid tool call response: ${callResult.error.message}`);
    }
    expect(callResult.data.content).toBeDefined();
    expect(Array.isArray(callResult.data.content)).toBe(true);
    expect(callResult.data.content[0]?.type).toBe("text");

    // The response should be JSON containing projects data
    const firstContent = callResult.data.content[0];
    expect(firstContent).toBeDefined();
    const parsed: unknown = JSON.parse(firstContent?.text ?? '{}');
    expect(parsed).toHaveProperty("projects");
    if (typeof parsed === 'object' && parsed !== null && 'projects' in parsed) {
      expect(Array.isArray(parsed.projects)).toBe(true);
    }
  });

  it("should handle tools/call with missing required parameters", async () => {
    sendRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "queryLogs",
        arguments: {
          // Missing required 'filter' parameter
          projectId: "test-project",
        },
      },
    });

    const response = await waitForResponse(4);
    expect(response.result).toBeDefined();
    const callResult = ToolCallResponseSchema.safeParse(response.result);
    if (!callResult.success) {
      throw new Error(`Invalid tool call response: ${callResult.error.message}`);
    }
    expect(callResult.data.content).toBeDefined();
    expect(callResult.data.content[0]?.type).toBe("text");
    expect(callResult.data.content[0]?.text).toContain("Invalid input");
  });

  it("should handle tools/call for unknown tool", async () => {
    sendRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "unknownTool",
        arguments: {},
      },
    });

    const response = await waitForResponse(5);
    expect(response.result).toBeDefined();
    const callResult = ToolCallResponseSchema.safeParse(response.result);
    if (!callResult.success) {
      throw new Error(`Invalid tool call response: ${callResult.error.message}`);
    }
    expect(callResult.data.isError).toBe(true);
    expect(callResult.data.content[0]?.text).toContain("Unknown tool: unknownTool");
  });

  it("should handle tools/call for queryLogs with valid parameters", async () => {
    sendRequest({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "queryLogs",
        arguments: {
          projectId: "test-project",
          filter: "severity >= ERROR",
          pageSize: 5,
        },
      },
    });

    const response = await waitForResponse(6);
    expect(response.result).toBeDefined();
    const callResult = ToolCallResponseSchema.safeParse(response.result);
    if (!callResult.success) {
      throw new Error(`Invalid tool call response: ${callResult.error.message}`);
    }
    expect(callResult.data.content).toBeDefined();
    expect(callResult.data.content[0]?.type).toBe("text");
    
    // Should return error or valid response depending on auth
    const text = callResult.data.content[0]?.text;
    expect(text).toBeTruthy();
  });

  it("should handle tools/call for getLogDetail", async () => {
    sendRequest({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: {
        name: "getLogDetail",
        arguments: {
          projectId: "test-project",
          logId: "test-log-id",
        },
      },
    });

    const response = await waitForResponse(7);
    expect(response.result).toBeDefined();
    const callResult = ToolCallResponseSchema.safeParse(response.result);
    if (!callResult.success) {
      throw new Error(`Invalid tool call response: ${callResult.error.message}`);
    }
    expect(callResult.data.content).toBeDefined();
    expect(callResult.data.content[0]?.type).toBe("text");
  });

  it("should handle concurrent tool calls", async () => {
    // Send multiple requests at once
    const requests: MCPRequest[] = [
      {
        jsonrpc: "2.0",
        id: 10,
        method: "tools/call",
        params: {
          name: "listProjects",
          arguments: { pageSize: 5 },
        },
      },
      {
        jsonrpc: "2.0",
        id: 11,
        method: "tools/list",
        params: {},
      },
      {
        jsonrpc: "2.0",
        id: 12,
        method: "tools/call",
        params: {
          name: "getLogDetail",
          arguments: { projectId: "test", logId: "log1" },
        },
      },
    ];

    requests.forEach(sendRequest);

    // Wait for all responses
    const responsePromises = await Promise.all([
      waitForResponse(10),
      waitForResponse(11),
      waitForResponse(12),
    ]);

    // All should have valid responses
    responsePromises.forEach((response) => {
      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
    });
  });
});