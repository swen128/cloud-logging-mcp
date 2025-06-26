import { describe, it, expect } from "bun:test";
import { validateTimeString, buildTimestampFilter, combineFilters } from "./time-range";

describe("time-range functions", () => {
  describe("validateTimeString", () => {
    it("should accept valid ISO 8601 strings", () => {
      const iso = "2024-01-01T00:00:00Z";
      const result = validateTimeString(iso);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(iso);
    });
    
    it("should accept ISO strings without Z suffix", () => {
      const iso = "2024-01-01T00:00:00";
      const result = validateTimeString(iso);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(iso);
    });
    
    it("should accept ISO strings with milliseconds", () => {
      const iso = "2024-01-01T00:00:00.123Z";
      const result = validateTimeString(iso);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(iso);
    });
    
    it("should return error for invalid format", () => {
      const result1 = validateTimeString("invalid");
      expect(result1.isErr()).toBe(true);
      expect(result1._unsafeUnwrapErr().message).toContain("Invalid time format");
      
      const result2 = validateTimeString("2024-01-01");
      expect(result2.isErr()).toBe(true);
      
      const result3 = validateTimeString("-1h");
      expect(result3.isErr()).toBe(true);
    });
    
    it("should return error for invalid dates", () => {
      const result1 = validateTimeString("2024-13-01T00:00:00Z");
      expect(result1.isErr()).toBe(true);
      expect(result1._unsafeUnwrapErr().message).toContain("Invalid date");
      
      const result2 = validateTimeString("2024-01-32T00:00:00Z");
      expect(result2.isErr()).toBe(true);
    });
  });
  
  describe("buildTimestampFilter", () => {
    it("should build filter with both start and end time", () => {
      const result = buildTimestampFilter("2024-01-01T00:00:00Z", "2024-01-01T23:59:59Z");
      expect(result.isOk()).toBe(true);
      const filter = result._unsafeUnwrap();
      expect(filter).toContain('timestamp>="2024-01-01T00:00:00Z"');
      expect(filter).toContain('timestamp<="2024-01-01T23:59:59Z"');
      expect(filter).toContain(' AND ');
    });
    
    it("should build filter with only start time", () => {
      const result = buildTimestampFilter("2024-01-01T00:00:00Z", undefined);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe('timestamp>="2024-01-01T00:00:00Z"');
    });
    
    it("should build filter with only end time", () => {
      const result = buildTimestampFilter(undefined, "2024-01-01T23:59:59Z");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe('timestamp<="2024-01-01T23:59:59Z"');
    });
    
    it("should return empty string when no times provided", () => {
      const result1 = buildTimestampFilter();
      expect(result1.isOk()).toBe(true);
      expect(result1._unsafeUnwrap()).toBe("");
      
      const result2 = buildTimestampFilter(undefined, undefined);
      expect(result2.isOk()).toBe(true);
      expect(result2._unsafeUnwrap()).toBe("");
    });
    
    it("should handle empty strings", () => {
      const result = buildTimestampFilter("", "");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe("");
    });
  });
  
  describe("combineFilters", () => {
    it("should combine existing filter with timestamp filter", () => {
      const existing = 'severity="ERROR"';
      const timestamp = 'timestamp>="2024-01-01T00:00:00Z"';
      const result = combineFilters(existing, timestamp);
      expect(result).toBe('(severity="ERROR") AND timestamp>="2024-01-01T00:00:00Z"');
    });
    
    it("should return existing filter when no timestamp filter", () => {
      const existing = 'resource.type="k8s_container"';
      expect(combineFilters(existing, "")).toBe(existing);
    });
    
    it("should return timestamp filter when no existing filter", () => {
      const timestamp = 'timestamp<="2024-01-15T00:00:00Z"';
      expect(combineFilters("", timestamp)).toBe(timestamp);
    });
    
    it("should handle complex existing filters", () => {
      const existing = 'severity="ERROR" OR severity="CRITICAL"';
      const timestamp = 'timestamp>="2024-01-01T00:00:00Z"';
      const result = combineFilters(existing, timestamp);
      expect(result).toBe('(severity="ERROR" OR severity="CRITICAL") AND timestamp>="2024-01-01T00:00:00Z"');
    });
  });
  
  describe("buildTimestampFilter with time range validation", () => {
    it("should return error when start time is after end time", () => {
      const result = buildTimestampFilter("2024-01-02T00:00:00Z", "2024-01-01T00:00:00Z");
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Start time must be before end time");
    });
    
    it("should return error when start time equals end time", () => {
      const result = buildTimestampFilter("2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z");
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Start time must be before end time");
    });
    
    it("should accept valid time range", () => {
      const result1 = buildTimestampFilter("2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z");
      expect(result1.isOk()).toBe(true);
      
      const result2 = buildTimestampFilter("2024-01-01T00:00:00Z", "2024-01-01T12:00:00Z");
      expect(result2.isOk()).toBe(true);
    });
  });
});