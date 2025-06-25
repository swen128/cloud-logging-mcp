import { describe, expect, it } from "bun:test";
import {
  transformLogEntries,
  createQueryLogsOutput,
} from "./query-logs";
import { createLogId } from "./log-id";
import type { RawLogEntry } from "./api";

describe("query-logs pure functions", () => {
  describe("transformLogEntries", () => {
    it("should transform entries with default summary", () => {
      const entries: RawLogEntry[] = [
        {
          insertId: createLogId("log1"),
          timestamp: "2024-01-01T10:00:00Z",
          severity: "INFO",
          textPayload: "First log message",
        },
        {
          insertId: createLogId("log2"),
          timestamp: "2024-01-01T10:01:00Z",
          severity: "ERROR",
          jsonPayload: { message: "Error occurred", code: 500 },
        },
      ];

      const result = transformLogEntries(entries);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "log1",
        summary: "First log message",
      });
      expect(result[1]).toEqual({
        id: "log2",
        summary: "Error occurred",
      });
    });

    it("should transform entries with custom summary fields", () => {
      const entries: RawLogEntry[] = [
        {
          insertId: createLogId("log1"),
          timestamp: "2024-01-01T10:00:00Z",
          severity: "INFO",
          labels: {
            service: "auth",
            env: "prod",
          },
          jsonPayload: {
            user: "john",
            action: "login",
          },
        },
      ];

      const result = transformLogEntries(entries, ["labels.service", "jsonPayload.action"]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "log1",
        summary: "labels.service: auth, jsonPayload.action: login",
      });
    });

    it("should handle empty entries array", () => {
      const result = transformLogEntries([]);
      expect(result).toEqual([]);
    });

    it("should handle entries with missing optional fields", () => {
      const entries: RawLogEntry[] = [
        {
          insertId: createLogId("minimal"),
          timestamp: "2024-01-01T10:00:00Z",
          severity: "INFO",
        },
      ];

      const result = transformLogEntries(entries);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "minimal",
        summary: "",
      });
    });
  });

  describe("createQueryLogsOutput", () => {
    it("should create output with logs and pagination", () => {
      const entries: RawLogEntry[] = [
        {
          insertId: createLogId("log1"),
          timestamp: "2024-01-01T10:00:00Z",
          severity: "INFO",
          textPayload: "Test message",
        },
        {
          insertId: createLogId("log2"),
          timestamp: "2024-01-01T10:01:00Z",
          severity: "WARNING",
          textPayload: "Warning message",
        },
      ];

      const result = createQueryLogsOutput(entries, "next-page-token");

      expect(result.logs).toHaveLength(2);
      expect(result.pageSize).toBe(2);
      expect(result.nextPageToken).toBe("next-page-token");
      expect(result.logs[0]?.id).toBe("log1");
      expect(result.logs[1]?.id).toBe("log2");
    });

    it("should create output without nextPageToken", () => {
      const entries: RawLogEntry[] = [
        {
          insertId: createLogId("single"),
          timestamp: "2024-01-01T10:00:00Z",
          severity: "INFO",
        },
      ];

      const result = createQueryLogsOutput(entries, undefined);

      expect(result.logs).toHaveLength(1);
      expect(result.pageSize).toBe(1);
      expect(result.nextPageToken).toBeUndefined();
    });

    it("should handle empty entries", () => {
      const result = createQueryLogsOutput([], undefined);

      expect(result.logs).toEqual([]);
      expect(result.pageSize).toBe(0);
      expect(result.nextPageToken).toBeUndefined();
    });

    it("should pass through summary fields", () => {
      const entries: RawLogEntry[] = [
        {
          insertId: createLogId("log1"),
          timestamp: "2024-01-01T10:00:00Z",
          severity: "INFO",
          labels: { app: "web" },
        },
      ];

      const result = createQueryLogsOutput(entries, undefined, ["labels.app"]);

      expect(result.logs[0]?.summary).toBe("labels.app: web");
    });
  });
});