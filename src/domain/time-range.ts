/**
 * Validate time string is in ISO 8601 format
 * @param timeStr Time string in ISO 8601 format
 * @returns The time string if valid
 */
export const validateTimeString = (timeStr: string): string => {
  // Basic ISO 8601 validation
  if (!timeStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
    throw new Error(`Invalid time format: ${timeStr}. Expected ISO 8601 format (e.g., 2024-01-01T00:00:00Z)`);
  }
  
  // Verify it's a valid date
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${timeStr}`);
  }
  
  return timeStr;
};

/**
 * Builds a timestamp filter clause for Google Cloud Logging
 * @param startTime Optional start time
 * @param endTime Optional end time
 * @returns Filter clause string or empty string if no time range specified
 */
export const buildTimestampFilter = (startTime?: string, endTime?: string): string => {
  const filters: string[] = [];
  
  if (startTime !== undefined && startTime !== '') {
    const validatedStart = validateTimeString(startTime);
    filters.push(`timestamp>="${validatedStart}"`);
  }
  
  if (endTime !== undefined && endTime !== '') {
    const validatedEnd = validateTimeString(endTime);
    filters.push(`timestamp<="${validatedEnd}"`);
  }
  
  return filters.join(' AND ');
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

/**
 * Validates that start time is before end time
 * @param startTime Start time string
 * @param endTime End time string
 * @returns true if valid, throws error if invalid
 */
export const validateTimeRange = (startTime?: string, endTime?: string): boolean => {
  if (startTime === undefined || startTime === '' || endTime === undefined || endTime === '') {
    return true;
  }
  
  const start = new Date(validateTimeString(startTime));
  const end = new Date(validateTimeString(endTime));
  
  if (start >= end) {
    throw new Error('Start time must be before end time');
  }
  
  return true;
};