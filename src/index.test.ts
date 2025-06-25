import { describe, expect, it } from "bun:test";
import { createCloudLoggingTools } from "./index";

describe("createCloudLoggingTools", () => {
  it("should create tools with default configuration", () => {
    const tools = createCloudLoggingTools();
    
    expect(tools).toBeDefined();
    expect(tools.queryLogs).toBeDefined();
    expect(tools.getLogDetail).toBeDefined();
    expect(tools.listProjects).toBeDefined();
  });

  it("should create tools with custom configuration", () => {
    const tools = createCloudLoggingTools({
      projectId: "test-project",
      cache: {
        ttlMs: 60000,
        maxEntries: 100
      }
    });
    
    expect(tools).toBeDefined();
    expect(tools.queryLogs).toBeDefined();
    expect(tools.getLogDetail).toBeDefined();
    expect(tools.listProjects).toBeDefined();
  });
});