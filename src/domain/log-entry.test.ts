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
    expect(result.insertId).toBe(createLogId("test-insert-id"));
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

    // TODO: Test redaction of sensitive info
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

    // TODO: Test redaction of sensitive info
  });
});
