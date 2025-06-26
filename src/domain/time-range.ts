import { Result, ok, err } from "neverthrow";

/**
 * Validate time string is in ISO 8601 format
 * @param timeStr Time string in ISO 8601 format
 * @returns Result with the time string if valid, or error
 */
export const validateTimeString = (timeStr: string): Result<string, Error> => {
  // Basic ISO 8601 validation
  if (!timeStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
    return err(new Error(`Invalid time format: ${timeStr}. Expected ISO 8601 format (e.g., 2024-01-01T00:00:00Z)`));
  }
  
  // Verify it's a valid date
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) {
    return err(new Error(`Invalid date: ${timeStr}`));
  }
  
  return ok(timeStr);
};

/**
 * Builds a timestamp filter clause for Google Cloud Logging
 * @param startTime Optional start time
 * @param endTime Optional end time
 * @returns Filter clause string or empty string if no time range specified
 */
export const buildTimestampFilter = (startTime?: string, endTime?: string): Result<string, Error> => {
  const filters: string[] = [];
  
  if (startTime !== undefined && startTime !== '') {
    const validatedStart = validateTimeString(startTime);
    if (validatedStart.isErr()) {
      return err(validatedStart.error);
    }
    filters.push(`timestamp>="${validatedStart.value}"`);
  }
  
  if (endTime !== undefined && endTime !== '') {
    const validatedEnd = validateTimeString(endTime);
    if (validatedEnd.isErr()) {
      return err(validatedEnd.error);
    }
    filters.push(`timestamp<="${validatedEnd.value}"`);
  }
  
  // Validate time range if both are provided
  if (filters.length === 2 && startTime !== undefined && startTime !== '' && endTime !== undefined && endTime !== '') {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      return err(new Error('Start time must be before end time'));
    }
  }
  
  return ok(filters.join(' AND '));
};

/**
 * Combines existing filter with timestamp filter
 * @param existingFilter Current filter string
 * @param timestampFilter Timestamp filter to add
 * @returns Combined filter string
 */
export const combineFilters = (existingFilter: string, timestampFilter: string): string => {
  if (!timestampFilter) {
    return existingFilter;
  }
  
  if (!existingFilter) {
    return timestampFilter;
  }
  
  // If existing filter already has content, wrap it in parentheses and combine
  return `(${existingFilter}) AND ${timestampFilter}`;
};

