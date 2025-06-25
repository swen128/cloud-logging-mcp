/**
 * LogId type - wraps string to provide type safety
 */
export interface LogId {
  readonly value: string;
  readonly _brand: "LogId";
}

/**
 * Create a LogId from a string
 */
export function createLogId(id: string): LogId {
  return {
    value: id,
    _brand: "LogId"
  };
}

/**
 * Get the string value from a LogId
 */
export function getLogIdValue(logId: LogId): string {
  return logId.value;
}
