import { describe, expect, it } from "bun:test";
import {
  buildLogFilter,
  formatLogEntry,
  formatError,
  formatNotFoundError,
} from "./get-log-detail";
import { createLogId } from "./log-id";
import type { CloudLoggingError, RawLogEntry } from "./api";

describe("get-log-detail pure functions", () => {
  describe("buildLogFilter", () => {
    it("should build correct filter for normal log ID", () => {
      const filter = buildLogFilter("log123");
      expect(filter).toBe('insertId="log123"');
    });

    it("should handle log ID with special characters", () => {
      const filter = buildLogFilter("log-with-special\"chars");
      expect(filter).toBe('insertId="log-with-special"chars"');
    });

    it("should handle empty log ID", () => {
      const filter = buildLogFilter("");
      expect(filter).toBe('insertId=""');
    });
  });

  describe("formatLogEntry", () => {
    it("should format log entry with proper indentation", () => {
      const entry: RawLogEntry = {
        insertId: createLogId("test123"),
        timestamp: "2024-01-01T00:00:00Z",
        severity: "INFO",
        textPayload: "Test message",
      };

      const formatted = formatLogEntry(entry);
      
      expect(formatted).toContain('"insertId"');
      expect(formatted).toContain('"test123"');
      expect(formatted).toContain('"timestamp": "2024-01-01T00:00:00Z"');
      expect(formatted).toContain('"severity": "INFO"');
      expect(formatted).toContain('"textPayload": "Test message"');
      
      // Check indentation
      expect(formatted).toContain("  \"insertId\":");
    });

    it("should format complex nested entry", () => {
      const entry: RawLogEntry = {
        insertId: createLogId("complex"),
        timestamp: "2024-01-01T00:00:00Z",
        severity: "ERROR",
        jsonPayload: {
          level: "error",
          message: "Something went wrong",
          details: {
            code: 500,
            trace: ["a", "b", "c"],
          },
        },
        labels: {
          env: "production",
          service: "api",
        },
      };

      const formatted = formatLogEntry(entry);
      
      expect(formatted).toContain('"code": 500');
      expect(formatted).toContain('"env": "production"');
    });
  });

  describe("formatError", () => {
    it("should format error with message and code", () => {
      const error: CloudLoggingError = {
        message: "Permission denied",
        code: "PERMISSION_DENIED",
      };

      const formatted = formatError(error);
      
      expect(formatted).toContain('"error": "Permission denied"');
      expect(formatted).toContain('"code": "PERMISSION_DENIED"');
    });

    it("should include proper indentation", () => {
      const error: CloudLoggingError = {
        message: "Not found",
        code: "NOT_FOUND",
      };

      const formatted = formatError(error);
      expect(formatted).toContain("  \"error\":");
      expect(formatted).toContain("  \"code\":");
    });
  });

  describe("formatNotFoundError", () => {
    it("should format not found error with log ID", () => {
      const formatted = formatNotFoundError("missing-log-123");
      
      expect(formatted).toContain('"error": "Log entry not found"');
      expect(formatted).toContain('"logId": "missing-log-123"');
    });
  });
});