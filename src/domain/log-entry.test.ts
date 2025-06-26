import { describe, expect, it } from "bun:test";
import type { RawLogEntry } from "./api";
import { summarize } from "./log-entry";
import { createLogId } from "./log-id";

const mockEntry = (overrides: Partial<RawLogEntry> = {}): RawLogEntry => ({
  insertId: createLogId("test-insert-id"),
  timestamp: "2025-04-06T12:00:00Z",
  severity: "INFO",
  logName: "projects/test-project/logs/test-log",
  resource: { type: "global", labels: {} },
  ...overrides,
});

describe("summarize", () => {
  it("should correctly map fields (insertId, timestamp, severity)", () => {
    const entry = mockEntry({ textPayload: "Test payload" });
    const result = summarize(entry);
    expect(result.insertId).toEqual(createLogId("test-insert-id"));
    expect(result.timestamp).toBe("2025-04-06T12:00:00Z");
    expect(result.severity).toBe("INFO");
  });

  describe("summary extraction without summaryFields", () => {
    it("should extract summary from textPayload", () => {
      const entry = mockEntry({ textPayload: "This is a text payload" });
      expect(summarize(entry).summary).toBe("This is a text payload");
    });

    it("should extract summary from jsonPayload.message", () => {
      const entry = mockEntry({
        jsonPayload: { message: "This is a JSON message" },
      });
      expect(summarize(entry).summary).toBe("This is a JSON message");
    });

    it("should extract summary from nested jsonPayload message", () => {
      const entry = mockEntry({
        jsonPayload: { data: { info: { message: "Nested message" } } },
      });
      expect(summarize(entry).summary).toBe("Nested message");
    });

    it("should prioritize textPayload over jsonPayload", () => {
      const entry = mockEntry({
        textPayload: "Use this text",
        jsonPayload: { message: "Do not use this" },
      });
      expect(summarize(entry).summary).toBe("Use this text");
    });

    it("should prioritize jsonPayload.message over nested message", () => {
      const entry = mockEntry({
        jsonPayload: {
          message: "Use this message",
          data: { info: { message: "Do not use this" } },
        },
      });
      expect(summarize(entry).summary).toBe("Use this message");
    });

    it("should use fallback summary when no standard payload is found", () => {
      const entry = mockEntry({
        jsonPayload: { httpRequest: { status: 200 } },
      });
      expect(summarize(entry).summary).toContain('"httpRequest":{"status":200}');
    });

    it("should redact API keys in textPayload", () => {
      const entry = mockEntry({
        textPayload: 'The API key is: api_key="sk-1234567890abcdef"',
      });
      const result = summarize(entry);
      expect(result.summary).not.toContain("sk-1234567890abcdef");
      expect(result.summary).toContain("api_key=");
    });

    it("should redact email addresses in jsonPayload", () => {
      const entry = mockEntry({
        jsonPayload: { 
          message: "User email is john.doe@example.com",
          userEmail: "jane.smith@company.org"
        },
      });
      const result = summarize(entry);
      expect(result.summary).not.toContain("john.doe@example.com");
      expect(result.summary).not.toContain("jane.smith@company.org");
      expect(result.summary).toContain("****");
    });

    it("should redact credit card numbers", () => {
      const entry = mockEntry({
        textPayload: "Payment processed for card 1234-5678-9012-3456",
      });
      const result = summarize(entry);
      expect(result.summary).not.toContain("1234-5678-9012-3456");
      expect(result.summary).toContain("****");
    });

    it("should redact IP addresses", () => {
      const entry = mockEntry({
        jsonPayload: { 
          message: "Request from IP 192.168.1.100",
          clientIp: "10.0.0.50"
        },
      });
      const result = summarize(entry);
      expect(result.summary).not.toContain("192.168.1.100");
      expect(result.summary).not.toContain("10.0.0.50");
    });

    it("should redact multiple sensitive items in same payload", () => {
      const entry = mockEntry({
        textPayload: 'API key="secret123", email: admin@example.com, IP: 192.168.1.1',
      });
      const result = summarize(entry);
      expect(result.summary).not.toContain("secret123");
      expect(result.summary).not.toContain("admin@example.com");
      expect(result.summary).not.toContain("192.168.1.1");
      expect(result.summary).toContain("key=");
    });
  });

  describe("summary extraction with summaryFields", () => {
    it("should extract summary from specified top-level fields", () => {
      const entry = mockEntry({
        textPayload: "Ignore this",
        labels: { user_id: "user123", request_id: "req456" },
      });
      const summaryFields = ["severity", "labels.user_id"];
      expect(summarize(entry, summaryFields).summary).toBe(
        "severity: INFO, labels.user_id: user123",
      );
    });

    it("should extract summary from specified nested fields (jsonPayload)", () => {
      const entry = mockEntry({
        jsonPayload: { data: { value: 100, status: "OK" }, user: "admin" },
      });
      const summaryFields = ["jsonPayload.user", "jsonPayload.data.status"];
      expect(summarize(entry, summaryFields).summary).toBe(
        "jsonPayload.user: admin, jsonPayload.data.status: OK",
      );
    });

    it("should handle missing fields gracefully", () => {
      const entry = mockEntry({
        jsonPayload: { user: "admin" },
      });
      const summaryFields = ["jsonPayload.user", "jsonPayload.missingField"];
      // missingField is omitted
      expect(summarize(entry, summaryFields).summary).toBe("jsonPayload.user: admin");
    });

    it("should fall back to default summary if no specified fields are found", () => {
      const entry = mockEntry({
        textPayload: "Fallback text",
        jsonPayload: { user: "admin" },
      });
      const summaryFields = ["nonExistentField", "anotherMissing.field"];
      // Falls back to default extraction (textPayload in this case)
      expect(summarize(entry, summaryFields).summary).toBe("Fallback text");
    });

    it("should handle empty summaryFields array (fallback to default)", () => {
      const entry = mockEntry({ textPayload: "Default summary" });
      const summaryFields: string[] = [];
      // Falls back to default extraction
      expect(summarize(entry, summaryFields).summary).toBe("Default summary");
    });

    it("should handle undefined summaryFields (fallback to default)", () => {
      const entry = mockEntry({ textPayload: "Default summary" });
      // Falls back to default extraction
      expect(summarize(entry, undefined).summary).toBe("Default summary");
    });

    it("should redact API keys in textPayload", () => {
      const entry = mockEntry({
        textPayload: 'The API key is: api_key="sk-1234567890abcdef"',
      });
      const result = summarize(entry);
      expect(result.summary).not.toContain("sk-1234567890abcdef");
      expect(result.summary).toContain("api_key=");
    });

    it("should redact email addresses in jsonPayload", () => {
      const entry = mockEntry({
        jsonPayload: { 
          message: "User email is john.doe@example.com",
          userEmail: "jane.smith@company.org"
        },
      });
      const result = summarize(entry);
      expect(result.summary).not.toContain("john.doe@example.com");
      expect(result.summary).not.toContain("jane.smith@company.org");
      expect(result.summary).toContain("****");
    });

    it("should redact credit card numbers", () => {
      const entry = mockEntry({
        textPayload: "Payment processed for card 1234-5678-9012-3456",
      });
      const result = summarize(entry);
      expect(result.summary).not.toContain("1234-5678-9012-3456");
      expect(result.summary).toContain("****");
    });

    it("should redact IP addresses", () => {
      const entry = mockEntry({
        jsonPayload: { 
          message: "Request from IP 192.168.1.100",
          clientIp: "10.0.0.50"
        },
      });
      const result = summarize(entry);
      expect(result.summary).not.toContain("192.168.1.100");
      expect(result.summary).not.toContain("10.0.0.50");
    });

    it("should redact multiple sensitive items in same payload", () => {
      const entry = mockEntry({
        textPayload: 'API key="secret123", email: admin@example.com, IP: 192.168.1.1',
      });
      const result = summarize(entry);
      expect(result.summary).not.toContain("secret123");
      expect(result.summary).not.toContain("admin@example.com");
      expect(result.summary).not.toContain("192.168.1.1");
      expect(result.summary).toContain("key=");
    });

    it("should redact sensitive data when using summaryFields", () => {
      const entry = mockEntry({
        jsonPayload: {
          userEmail: "admin@example.com",
          ipAddress: "192.168.1.100",
          status: "success"
        },
        labels: {
          creditCard: "1234-5678-9012-3456"
        }
      });
      const summaryFields = ["jsonPayload.userEmail", "jsonPayload.ipAddress", "labels.creditCard"];
      const result = summarize(entry, summaryFields);
      
      // Should include field names but redact sensitive values
      expect(result.summary).toContain("jsonPayload.userEmail:");
      expect(result.summary).toContain("jsonPayload.ipAddress:");
      expect(result.summary).toContain("labels.creditCard:");
      
      // Should NOT include actual sensitive data
      expect(result.summary).not.toContain("admin@example.com");
      expect(result.summary).not.toContain("192.168.1.100");
      expect(result.summary).not.toContain("1234-5678-9012-3456");
      
      // Should contain redacted markers
      expect(result.summary).toContain("****");
    });

    it("should handle mixed sensitive and non-sensitive fields", () => {
      const entry = mockEntry({
        jsonPayload: {
          message: "Processing request",
          userEmail: "user@example.com",
          requestId: "req-123"
        }
      });
      const summaryFields = ["jsonPayload.message", "jsonPayload.userEmail", "jsonPayload.requestId"];
      const result = summarize(entry, summaryFields);
      
      // Non-sensitive data should remain
      expect(result.summary).toContain("Processing request");
      expect(result.summary).toContain("req-123");
      
      // Sensitive data should be redacted
      expect(result.summary).not.toContain("user@example.com");
    });
  });
});
