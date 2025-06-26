import { describe, it, expect } from "bun:test";
import { summarize } from "./log-entry";
import { createLogId } from "./log-id";
import type { RawLogEntry } from "./api";

describe("log entry object serialization", () => {
  it("should properly serialize objects in summaryFields", () => {
    const entry: RawLogEntry = {
      insertId: createLogId("test-1"),
      timestamp: "2023-01-01T00:00:00Z",
      severity: "INFO",
      textPayload: undefined,
      jsonPayload: {
        request: {
          method: "POST",
          url: "/api/users",
          headers: {
            "content-type": "application/json",
            "user-agent": "Mozilla/5.0"
          }
        },
        response: {
          status: 200,
          body: {
            id: 123,
            name: "Test User"
          }
        }
      },
      protoPayload: undefined,
      labels: undefined,
      resource: undefined,
      httpRequest: undefined,
      trace: undefined,
      spanId: undefined,
      traceSampled: undefined,
      sourceLocation: undefined,
      operation: undefined,
    };

    const result = summarize(entry, ["jsonPayload.request", "jsonPayload.response.status"]);
    
    expect(result.summary).toContain('"method": "POST"');
    expect(result.summary).toContain('"url": "/api/users"');
    expect(result.summary).toContain("jsonPayload.response.status: 200");
    expect(result.summary).not.toContain("[object Object]");
  });

  it("should handle arrays in summaryFields", () => {
    const entry: RawLogEntry = {
      insertId: createLogId("test-2"),
      timestamp: "2023-01-01T00:00:00Z",
      severity: "INFO",
      textPayload: undefined,
      jsonPayload: {
        items: ["item1", "item2", "item3"],
        tags: [
          { name: "tag1", value: 10 },
          { name: "tag2", value: 20 }
        ]
      },
      protoPayload: undefined,
      labels: undefined,
      resource: undefined,
      httpRequest: undefined,
      trace: undefined,
      spanId: undefined,
      traceSampled: undefined,
      sourceLocation: undefined,
      operation: undefined,
    };

    const result = summarize(entry, ["jsonPayload.items", "jsonPayload.tags"]);
    
    // Arrays should be pretty-printed when small
    expect(result.summary).toContain('"item1"');
    expect(result.summary).toContain('"item2"');
    expect(result.summary).toContain('"item3"');
    expect(result.summary).toContain('"name": "tag1"');
    expect(result.summary).toContain('"value": 10');
    expect(result.summary).not.toContain("[object Object]");
  });

  it("should handle deeply nested objects", () => {
    const deepObject = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                message: "Deep message",
                data: [1, 2, 3]
              }
            }
          }
        }
      }
    };

    const entry: RawLogEntry = {
      insertId: createLogId("test-3"),
      timestamp: "2023-01-01T00:00:00Z",
      severity: "INFO",
      textPayload: undefined,
      jsonPayload: deepObject,
      protoPayload: undefined,
      labels: undefined,
      resource: undefined,
      httpRequest: undefined,
      trace: undefined,
      spanId: undefined,
      traceSampled: undefined,
      sourceLocation: undefined,
      operation: undefined,
    };

    const result = summarize(entry, ["jsonPayload"]);
    
    expect(result.summary).toContain('"level1"');
    expect(result.summary).toContain('"level5"');
    expect(result.summary).toContain('"message": "Deep message"');
    expect(result.summary).not.toContain("[object Object]");
  });

  it("should compact very large objects", () => {
    const largeObject = {
      data: Array(100).fill(0).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `This is a very long description for item ${i} that contains lots of text`
      }))
    };

    const entry: RawLogEntry = {
      insertId: createLogId("test-4"),
      timestamp: "2023-01-01T00:00:00Z",
      severity: "INFO",
      textPayload: undefined,
      jsonPayload: largeObject,
      protoPayload: undefined,
      labels: undefined,
      resource: undefined,
      httpRequest: undefined,
      trace: undefined,
      spanId: undefined,
      traceSampled: undefined,
      sourceLocation: undefined,
      operation: undefined,
    };

    const result = summarize(entry, ["jsonPayload"]);
    
    // Should be compacted (no newlines)
    expect(result.summary).not.toContain('\n');
    expect(result.summary).toContain('"data":[{');
    expect(result.summary).not.toContain("[object Object]");
  });

  it("should handle circular references gracefully", () => {
    const circular: Record<string, unknown> = { name: "circular" };
    circular.self = circular;

    const entry: RawLogEntry = {
      insertId: createLogId("test-5"),
      timestamp: "2023-01-01T00:00:00Z",
      severity: "INFO",
      textPayload: undefined,
      jsonPayload: circular,
      protoPayload: undefined,
      labels: undefined,
      resource: undefined,
      httpRequest: undefined,
      trace: undefined,
      spanId: undefined,
      traceSampled: undefined,
      sourceLocation: undefined,
      operation: undefined,
    };

    const result = summarize(entry, ["jsonPayload"]);
    
    expect(result.summary).toContain("[Complex Object]");
    expect(result.summary).not.toContain("[object Object]");
  });
});