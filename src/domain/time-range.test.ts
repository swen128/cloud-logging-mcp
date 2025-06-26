import { describe, it, expect } from "bun:test";
import { validateTimeString, buildTimestampFilter, combineFilters, validateTimeRange } from "./time-range";

describe("time-range functions", () => {
  describe("validateTimeString", () => {
    it("should accept valid ISO 8601 strings", () => {
      const iso = "2024-01-01T00:00:00Z";
      expect(validateTimeString(iso)).toBe(iso);
    });
    
    it("should accept ISO strings without Z suffix", () => {
      const iso = "2024-01-01T00:00:00";
      expect(validateTimeString(iso)).toBe(iso);
    });
    
    it("should accept ISO strings with milliseconds", () => {
      const iso = "2024-01-01T00:00:00.123Z";
      expect(validateTimeString(iso)).toBe(iso);
    });
    
    it("should throw error for invalid format", () => {
      expect(() => validateTimeString("invalid")).toThrow("Invalid time format");
      expect(() => validateTimeString("2024-01-01")).toThrow("Invalid time format");
      expect(() => validateTimeString("-1h")).toThrow("Invalid time format");
    });
    
    it("should throw error for invalid dates", () => {
      expect(() => validateTimeString("2024-13-01T00:00:00Z")).toThrow("Invalid date");
      expect(() => validateTimeString("2024-01-32T00:00:00Z")).toThrow("Invalid date");
    });
  });
  
  describe("buildTimestampFilter", () => {
    it("should build filter with both start and end time", () => {
      const filter = buildTimestampFilter("2024-01-01T00:00:00Z", "2024-01-01T23:59:59Z");
      expect(filter).toContain('timestamp>="2024-01-01T00:00:00Z"');
      expect(filter).toContain('timestamp<="2024-01-01T23:59:59Z"');
      expect(filter).toContain(' AND ');
    });
    
    it("should build filter with only start time", () => {
      const filter = buildTimestampFilter("2024-01-01T00:00:00Z", undefined);
      expect(filter).toBe('timestamp>="2024-01-01T00:00:00Z"');
    });
    
    it("should build filter with only end time", () => {
      const filter = buildTimestampFilter(undefined, "2024-01-01T23:59:59Z");
      expect(filter).toBe('timestamp<="2024-01-01T23:59:59Z"');
    });
    
    it("should return empty string when no times provided", () => {
      expect(buildTimestampFilter()).toBe("");
      expect(buildTimestampFilter(undefined, undefined)).toBe("");
    });
    
    it("should handle empty strings", () => {
      expect(buildTimestampFilter("", "")).toBe("");
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
  
  describe("validateTimeRange", () => {
    it("should return true for valid time range", () => {
      expect(validateTimeRange("2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z")).toBe(true);
      expect(validateTimeRange("2024-01-01T00:00:00Z", "2024-01-01T12:00:00Z")).toBe(true);
    });
    
    it("should throw error when start time is after end time", () => {
      expect(() => validateTimeRange("2024-01-02T00:00:00Z", "2024-01-01T00:00:00Z")).toThrow("Start time must be before end time");
    });
    
    it("should throw error when start time equals end time", () => {
      expect(() => validateTimeRange("2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z")).toThrow("Start time must be before end time");
    });
    
    it("should return true when either time is undefined", () => {
      expect(validateTimeRange("2024-01-01T00:00:00Z", undefined)).toBe(true);
      expect(validateTimeRange(undefined, "2024-01-01T00:00:00Z")).toBe(true);
      expect(validateTimeRange(undefined, undefined)).toBe(true);
    });
    
    it("should return true when either time is empty string", () => {
      expect(validateTimeRange("2024-01-01T00:00:00Z", "")).toBe(true);
      expect(validateTimeRange("", "2024-01-01T00:00:00Z")).toBe(true);
      expect(validateTimeRange("", "")).toBe(true);
    });
  });
});