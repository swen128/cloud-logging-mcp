import { Result, ok, err } from "neverthrow";
import { buildTimestampFilter, combineFilters } from "./time-range";

interface QueryLogsFilterInput {
  filter: string;
  startTime: string;
  endTime: string;
}

/**
 * Builds the complete filter for querying logs by combining base filter with time range
 * @param input Filter input parameters
 * @returns Combined filter string or error
 */
export const buildQueryLogsFilter = (input: QueryLogsFilterInput): Result<string, Error> => {
  const timestampFilterResult = buildTimestampFilter(input.startTime, input.endTime);
  if (timestampFilterResult.isErr()) {
    return err(timestampFilterResult.error);
  }
  
  const combinedFilter = combineFilters(input.filter, timestampFilterResult.value);
  return ok(combinedFilter);
};