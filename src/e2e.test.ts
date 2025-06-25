import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { spawn, type ChildProcess } from "child_process";
import { createInterface } from "readline";

describe("MCP Server E2E Tests", () => {
  let serverProcess: ChildProcess;
  let sendRequest: (request: any) => void;
  let waitForResponse: (id: number, timeout?: number) => Promise<any>;
  const responses = new Map<number, any>();

  beforeAll(async () => {
    // Start the MCP server
    serverProcess = spawn("bun", ["run", "src/main.ts"], {
      env: { ...process.env, GOOGLE_CLOUD_PROJECT: "test-project" },
    });

    const rl = createInterface({
      input: serverProcess.stdout!,
      terminal: false,
    });

    // Collect responses
    rl.on("line", (line) => {
      try {
        const response = JSON.parse(line);
        if (response.id !== undefined) {
          responses.set(response.id, response);
        }
      } catch (e) {
        // Ignore non-JSON output
      }
    });

    // Helper to send requests
    sendRequest = (request: any) => {
      serverProcess.stdin!.write(JSON.stringify(request) + "\n");
    };

    // Helper to wait for response
    waitForResponse = (id: number, timeout = 5000): Promise<any> => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if (responses.has(id)) {
            clearInterval(checkInterval);
            resolve(responses.get(id));
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
    expect(initResponse.result.serverInfo.name).toBe("Google Cloud Logging MCP");

    // Send initialized notification
    sendRequest({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    // Give server time to process
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  it("should return server capabilities on initialization", async () => {
    const initResponse = responses.get(1);
    expect(initResponse.result.capabilities).toEqual({
      tools: {},
    });
    expect(initResponse.result.protocolVersion).toBe("2024-11-05");
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
    expect(response.result.tools).toHaveLength(3);

    const toolNames = response.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain("queryLogs");
    expect(toolNames).toContain("getLogDetail");
    expect(toolNames).toContain("listProjects");

    // Check tool schemas
    const queryLogsTool = response.result.tools.find((t: any) => t.name === "queryLogs");
    expect(queryLogsTool.inputSchema.type).toBe("object");
    expect(queryLogsTool.inputSchema.required).toContain("filter");
    expect(queryLogsTool.inputSchema.properties.filter.type).toBe("string");
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
    expect(response.result.content).toBeDefined();
    expect(Array.isArray(response.result.content)).toBe(true);
    expect(response.result.content[0].type).toBe("text");

    // The response should be JSON containing projects data
    const content = JSON.parse(response.result.content[0].text);
    expect(content).toHaveProperty("projects");
    expect(Array.isArray(content.projects)).toBe(true);
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
    expect(response.result.content).toBeDefined();
    expect(response.result.content[0].type).toBe("text");
    expect(response.result.content[0].text).toContain("Error");
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
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toContain("Unknown tool: unknownTool");
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
    expect(response.result.content).toBeDefined();
    expect(response.result.content[0].type).toBe("text");
    
    // Should return error or valid response depending on auth
    const text = response.result.content[0].text;
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
    expect(response.result.content).toBeDefined();
    expect(response.result.content[0].type).toBe("text");
  });

  it("should handle concurrent tool calls", async () => {
    // Send multiple requests at once
    const requests = [
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
    const responses = await Promise.all([
      waitForResponse(10),
      waitForResponse(11),
      waitForResponse(12),
    ]);

    // All should have valid responses
    responses.forEach((response) => {
      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
    });
  });
});