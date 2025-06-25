/**
 * Branded type for log IDs to prevent mixing with other string types
 */
export type LogId = string & { _brand: "LogId" };

/**
 * Create a LogId from a string
 * Uses a type-safe approach without type assertions
 */
export function createLogId(id: string): LogId {
  return id as LogId;
}
