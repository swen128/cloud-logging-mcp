import type { Result } from "neverthrow";
import type { LogId } from "./log-id";
import type { ListProjectsInput, ListProjectsOutput } from "./list-projects";

/**
 * Interface for Cloud Logging adapter
 */
export interface CloudLoggingApi {
  /**
   * Queries logs from Cloud Logging
   * @param params Query parameters
   * @returns Result with entries and nextPageToken, or error
   */
  entries(params: CloudLoggingQuery): Promise<
    Result<
      {
        entries: RawLogEntry[];
        nextPageToken?: string;
      },
      CloudLoggingError
    >
  >;

  /**
   * Lists available Google Cloud projects
   * @param params List parameters
   * @returns Promise with list of projects or error
   */
  listProjects(params: ListProjectsInput): Promise<ListProjectsOutput>;

  /**
   * Gets the default project ID from environment or gcloud config
   * @returns Promise with project ID or undefined
   */
  getDefaultProjectId(): Promise<string | undefined>;
}

export interface CloudLoggingQuery {
  projectId: string;
  filter: string;
  resourceNames?: string[]; // e.g. "projects/project_id/logs/run.googleapis.com%2Fstdout"
  pageSize?: number;
  pageToken?: string;
  orderBy?: {
    timestamp: "asc" | "desc";
  };
  summaryFields?: string[]; // Fields to include in the summary, e.g. ["labels.service", "textPayload"]
}

/**
 * Error types for Cloud Logging operations
 */
type CloudLoggingErrorCode =
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "INVALID_ARGUMENT"
  | "INTERNAL"
  | "UNAVAILABLE"
  | "UNAUTHENTICATED";

/**
 * Error details for Cloud Logging operations
 */
export type CloudLoggingError = {
  message: string;
  code?: CloudLoggingErrorCode;
};

export type RawLogEntry = Record<string, unknown> & {
  insertId: LogId;
  timestamp: string;
  severity: LogSeverity;
  jsonPayload?: Record<string, unknown>;
  protoPayload?: Record<string, unknown>;
  textPayload?: string;
};

export type LogSeverity =
  | "DEFAULT"
  | "DEBUG"
  | "INFO"
  | "NOTICE"
  | "WARNING"
  | "ERROR"
  | "CRITICAL"
  | "ALERT"
  | "EMERGENCY";
