import type { RawLogEntry } from "./api";
import type { LogId } from "./log-id";

/**
 * Interface for log cache
 */
export interface LogCache {
  /**
   * Adds an entry to the cache
   * @param id The log ID
   * @param entry The log entry
   */
  add(id: LogId, entry: RawLogEntry): void;

  /**
   * Gets an entry from the cache
   * @param id The log ID
   * @returns The log entry or undefined if not found or expired
   */
  get(id: LogId): RawLogEntry | undefined;
}
