import { describe, it, expect } from "bun:test";
import { queryLogsInputSchema } from "./queryLogs";

describe("queryLogs input validation", () => {
  it("should accept valid input with time range", () => {
    const input = {
      projectId: "test-project",
      filter: 'severity="ERROR"',
      startTime: "2024-01-01T00:00:00Z",
      endTime: "2024-01-01T23:59:59Z",
    };
    
    const result = queryLogsInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
  
  it("should accept ISO 8601 time formats", () => {
    const input = {
      projectId: "test-project",
      filter: "",
      startTime: "2024-01-01T00:00:00Z",
      endTime: "2024-01-01T23:59:59Z",
    };
    
    const result = queryLogsInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
  
  it("should accept input without time range", () => {
    const input = {
      projectId: "test-project",
      filter: 'resource.type="k8s_container"',
    };
    
    const result = queryLogsInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
  
  it("should accept input with only startTime", () => {
    const input = {
      projectId: "test-project",
      filter: "",
      startTime: "2024-01-01T00:00:00Z",
    };
    
    const result = queryLogsInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
  
  it("should reject input without projectId", () => {
    const input = {
      filter: 'severity="ERROR"',
      startTime: "2024-01-01T00:00:00Z",
    };
    
    const result = queryLogsInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
  
  it("should reject input without filter", () => {
    const input = {
      projectId: "test-project",
      startTime: "-1h",
    };
    
    const result = queryLogsInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});