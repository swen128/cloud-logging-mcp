import { describe, it, expect } from "bun:test";
import { buildQueryLogsFilter } from "./query-logs-filter";

describe("buildQueryLogsFilter", () => {
  it("should combine base filter with time range", () => {
    const result = buildQueryLogsFilter({
      filter: 'severity="ERROR"',
      startTime: "2024-01-01T00:00:00Z",
      endTime: "2024-01-01T23:59:59Z",
    });
    expect(result.isOk()).toBe(true);
    const filter = result._unsafeUnwrap();
    expect(filter).toBe('(severity="ERROR") AND timestamp>="2024-01-01T00:00:00Z" AND timestamp<="2024-01-01T23:59:59Z"');
  });

  it("should handle empty base filter with time range", () => {
    const result = buildQueryLogsFilter({
      filter: "",
      startTime: "2024-01-01T00:00:00Z",
      endTime: "2024-01-01T23:59:59Z",
    });
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('timestamp>="2024-01-01T00:00:00Z" AND timestamp<="2024-01-01T23:59:59Z"');
  });

  it("should handle filter with all required fields", () => {
    const result = buildQueryLogsFilter({
      filter: 'resource.type="k8s_container"',
      startTime: "2024-01-01T00:00:00Z",
      endTime: "2024-01-02T00:00:00Z",
    });
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('(resource.type="k8s_container") AND timestamp>="2024-01-01T00:00:00Z" AND timestamp<="2024-01-02T00:00:00Z"');
  });

  it("should return error for invalid start time", () => {
    const result = buildQueryLogsFilter({
      filter: 'severity="ERROR"',
      startTime: "invalid-date",
      endTime: "2024-01-01T23:59:59Z",
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain("Invalid time format");
  });

  it("should return error for invalid end time", () => {
    const result = buildQueryLogsFilter({
      filter: 'severity="ERROR"',
      startTime: "2024-01-01T00:00:00Z",
      endTime: "2024-13-01T00:00:00Z",
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain("Invalid date");
  });

  it("should return error when start time is after end time", () => {
    const result = buildQueryLogsFilter({
      filter: 'severity="ERROR"',
      startTime: "2024-01-02T00:00:00Z",
      endTime: "2024-01-01T00:00:00Z",
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Start time must be before end time");
  });

  it("should handle complex filters with time range", () => {
    const result = buildQueryLogsFilter({
      filter: 'severity="ERROR" OR severity="CRITICAL"',
      startTime: "2024-01-01T00:00:00Z",
      endTime: "2024-01-01T23:59:59Z",
    });
    expect(result.isOk()).toBe(true);
    const filter = result._unsafeUnwrap();
    expect(filter).toBe('(severity="ERROR" OR severity="CRITICAL") AND timestamp>="2024-01-01T00:00:00Z" AND timestamp<="2024-01-01T23:59:59Z"');
  });
});