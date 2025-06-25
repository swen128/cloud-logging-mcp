import { describe, expect, jest, test } from "bun:test";
import type { RawLogEntry } from "../domain/api";
import { createLogId } from "../domain/log-id";
import { LogCacheImpl } from "./cache";

describe("LogCache", () => {
  test("should add and retrieve entries", () => {
    const cache = new LogCacheImpl({
      ttlMs: 30 * 60 * 1000,
      maxEntries: 10,
    });

    const logId = createLogId("log-123");
    const entry: RawLogEntry = {
      insertId: logId,
      timestamp: new Date().toISOString(),
      severity: "INFO",
      textPayload: "Test log",
    };
    cache.add(logId, entry);

    const retrieved = cache.get(logId);
    expect(retrieved).toEqual(entry);
  });

  test("should return undefined for non-existent entries", () => {
    const cache = new LogCacheImpl({
      ttlMs: 30 * 60 * 1000,
      maxEntries: 10,
    });
    expect(cache.get(createLogId("non-existent"))).toBeUndefined();
  });

  test("should expire entries after TTL", async () => {
    // Create cache with short TTL (100ms)
    const shortTtlCache = new LogCacheImpl({
      ttlMs: 100,
      maxEntries: 10,
    });

    const logId = createLogId("log-123");
    const entry: RawLogEntry = {
      insertId: logId,
      timestamp: new Date().toISOString(),
      severity: "INFO",
      textPayload: "Test log",
    };

    shortTtlCache.add(logId, entry);
    expect(shortTtlCache.get(logId)).toEqual(entry);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Entry should be expired
    expect(shortTtlCache.get(logId)).toBeUndefined();
  });

  test("should remove oldest entries when cache is full", () => {
    // Create cache with small capacity
    const smallCache = new LogCacheImpl({
      ttlMs: 30 * 60 * 1000,
      maxEntries: 3,
    });

    // Mock Date.now to control timestamps
    const originalNow = Date.now;
    let mockTime = 1000;

    try {
      // @ts-ignore - Mocking Date.now
      Date.now = jest.fn(() => mockTime);

      // Add entries with increasing timestamps
      const logId1 = createLogId("log-1");
      const logId2 = createLogId("log-2");
      const logId3 = createLogId("log-3");
      const logId4 = createLogId("log-4");

      smallCache.add(logId1, { insertId: logId1, timestamp: new Date().toISOString(), severity: "INFO" });
      mockTime += 1000;
      smallCache.add(logId2, { insertId: logId2, timestamp: new Date().toISOString(), severity: "INFO" });
      mockTime += 1000;
      smallCache.add(logId3, { insertId: logId3, timestamp: new Date().toISOString(), severity: "INFO" });

      // All entries should be present
      expect(smallCache.get(logId1)).toEqual({ insertId: logId1, timestamp: expect.any(String), severity: "INFO" });
      expect(smallCache.get(logId2)).toEqual({ insertId: logId2, timestamp: expect.any(String), severity: "INFO" });
      expect(smallCache.get(logId3)).toEqual({ insertId: logId3, timestamp: expect.any(String), severity: "INFO" });

      // Add one more entry, should evict the oldest (log-1)
      mockTime += 1000;
      smallCache.add(logId4, { insertId: logId4, timestamp: new Date().toISOString(), severity: "INFO" });

      // log-1 should be evicted
      expect(smallCache.get(logId1)).toBeUndefined();
      expect(smallCache.get(logId2)).toEqual({ insertId: logId2, timestamp: expect.any(String), severity: "INFO" });
      expect(smallCache.get(logId3)).toEqual({ insertId: logId3, timestamp: expect.any(String), severity: "INFO" });
      expect(smallCache.get(logId4)).toEqual({ insertId: logId4, timestamp: expect.any(String), severity: "INFO" });
    } finally {
      // Restore original Date.now
      Date.now = originalNow;
    }
  });
});
