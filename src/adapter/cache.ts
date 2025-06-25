/**
 * Cache implementation for Cloud Logging MCP server
 */

import type { LogCache } from "../domain/cache";
import type { RawLogEntry } from "../domain/api";
import type { LogId } from "../domain/log-id";

/**
 * Cache configuration
 */
interface CacheConfig {
  /** Time-to-live in milliseconds */
  ttlMs: number;
  /** Maximum number of entries to store */
  maxEntries: number;
}

/**
 * Interface for log cache entries
 */
interface LogCacheEntry {
  entry: RawLogEntry;
  timestamp: number;
}

/**
 * Cache for log entries
 */
export class LogCacheImpl implements LogCache {
  private cache: Map<LogId, LogCacheEntry> = new Map();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  /**
   * Creates a new LogCache instance
   * @param config Cache configuration
   */
  constructor(config?: Partial<CacheConfig>) {
    this.maxEntries = config?.maxEntries ?? 1000; // Default: 1000 entries
    this.ttlMs = config?.ttlMs ?? 30 * 60 * 1000; // Default: 30 minutes
  }

  /**
   * Adds an entry to the cache
   * @param id The log ID
   * @param entry The log entry
   */
  add(id: LogId, entry: RawLogEntry): void {
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxEntries) {
      this.evictOldestEntries();
    }

    // Add to cache
    this.cache.set(id, {
      entry,
      timestamp: Date.now(),
    });
  }

  /**
   * Gets an entry from the cache
   * @param id The log ID
   * @returns The log entry or undefined if not found or expired
   */
  get(id: LogId): RawLogEntry | undefined {
    const cached = this.cache.get(id);
    return !cached
      ? undefined
      : (Date.now() - cached.timestamp > this.ttlMs)
        ? (this.cache.delete(id), undefined)
        : cached.entry;
  }

  /**
   * Evicts the oldest entries from the cache
   */
  private evictOldestEntries(): void {
    // Convert to array, sort by timestamp, and remove oldest
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );

    // Remove oldest entries to make room
    const toRemove = entries.slice(0, Math.max(1, Math.floor(this.maxEntries * 0.1))); // Remove at least 1 entry or 10% of max
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }
}
