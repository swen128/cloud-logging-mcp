import { Logging } from "@google-cloud/logging";
import { ProjectsClient } from "@google-cloud/resource-manager";
import { ok, err, type Result } from "neverthrow";
import type { CloudLoggingApi, CloudLoggingQuery, RawLogEntry, LogSeverity } from "../domain/api";
import type { CloudLoggingError } from "../domain/api";
import type { ListProjectsInput, ListProjectsOutput, Project } from "../domain/list-projects";
import { createLogId } from "../domain/log-id";

export class GoogleCloudLoggingApiClient implements CloudLoggingApi {
  private logging: Logging;
  private projectsClient: ProjectsClient;
  private defaultProjectId?: string;

  constructor(projectId?: string) {
    this.logging = new Logging({ projectId });
    this.projectsClient = new ProjectsClient();
    this.defaultProjectId = projectId;
  }

  async getDefaultProjectId(): Promise<string | undefined> {
    if (this.defaultProjectId !== undefined && this.defaultProjectId !== '') {
      return this.defaultProjectId;
    }
    
    // Try to get from the Logging client's detected project
    try {
      const detectedProjectId = await this.logging.auth.getProjectId();
      this.defaultProjectId = detectedProjectId;
      return detectedProjectId;
    } catch {
      return undefined;
    }
  }

  async entries(params: CloudLoggingQuery): Promise<
    Result<
      {
        entries: RawLogEntry[];
        nextPageToken?: string;
      },
      CloudLoggingError
    >
  > {
    try {
      interface GetEntriesRequest {
        projectIds: string[];
        filter: string;
        pageSize: number;
        pageToken?: string;
        orderBy: string;
        resourceNames?: string[];
      }

      const request: GetEntriesRequest = {
        projectIds: [params.projectId],
        filter: params.filter,
        pageSize: params.pageSize ?? 100,
        pageToken: params.pageToken,
        orderBy: params.orderBy !== undefined ? `timestamp ${params.orderBy.timestamp}` : "timestamp desc",
      };

      if (params.resourceNames !== undefined && params.resourceNames.length > 0) {
        request.resourceNames = params.resourceNames;
      }

      const getEntriesResult = await this.logging.getEntries(request);
      const entries = getEntriesResult[0];
      const response = getEntriesResult[2];

      const rawEntries: RawLogEntry[] = entries.map((entry) => {
        const metadata: Record<string, unknown> = typeof entry.metadata === 'object' && entry.metadata !== null ? entry.metadata : {};
        const data: unknown = entry.data;

        const timestamp = ((): string => {
          if (metadata.timestamp !== undefined && metadata.timestamp !== null) {
            if (typeof metadata.timestamp === 'string') {
              return metadata.timestamp;
            } else if (metadata.timestamp instanceof Date) {
              return metadata.timestamp.toISOString();
            } else if (typeof metadata.timestamp === 'object' && 'seconds' in metadata.timestamp) {
              // Handle Google protobuf Timestamp
              const timestampObj = metadata.timestamp;
              const seconds = 'seconds' in timestampObj ? timestampObj.seconds : undefined;
              if (seconds !== undefined) {
                return new Date(Number(seconds) * 1000).toISOString();
              }
              return new Date().toISOString();
            } else {
              return new Date().toISOString();
            }
          } else {
            return new Date().toISOString();
          }
        })()

        return {
          insertId: createLogId(typeof metadata.insertId === 'string' ? metadata.insertId : ""),
          timestamp,
          severity: this.mapSeverity(metadata.severity),
          jsonPayload: typeof data === "object" && data !== null && !Buffer.isBuffer(data) ? this.cloneObject(data) : undefined,
          textPayload: typeof data === "string" ? data : Buffer.isBuffer(data) ? data.toString() : undefined,
          protoPayload: this.convertProtoPayload(metadata.protoPayload),
          labels: metadata.labels,
          resource: metadata.resource,
          httpRequest: metadata.httpRequest,
          trace: metadata.trace,
          spanId: metadata.spanId,
          traceSampled: metadata.traceSampled,
          sourceLocation: metadata.sourceLocation,
          operation: metadata.operation,
        };
      });

      return ok({
        entries: rawEntries,
        nextPageToken: response?.nextPageToken ?? undefined,
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : { message: String(error) };
      const cloudError: CloudLoggingError = {
        message: errorObj.message ?? "Unknown error occurred",
        code: this.mapErrorCode('code' in errorObj && typeof errorObj.code === 'number' ? errorObj.code : undefined),
      };
      return err(cloudError);
    }
  }

  private mapSeverity(severity: unknown): LogSeverity {
    if (typeof severity !== 'string') {
      return "DEFAULT";
    }
    
    switch (severity) {
      case "DEFAULT":
      case "DEBUG":
      case "INFO":
      case "NOTICE":
      case "WARNING":
      case "ERROR":
      case "CRITICAL":
      case "ALERT":
      case "EMERGENCY":
        return severity;
      default:
        return "DEFAULT";
    }
  }

  private convertProtoPayload(payload: unknown): Record<string, unknown> | undefined {
    if (payload === null || payload === undefined) {
      return undefined;
    }
    
    if (typeof payload === 'object') {
      // Convert protobuf object to plain object
      return this.cloneObject(payload);
    }
    
    return undefined;
  }

  private cloneObject(obj: unknown): Record<string, unknown> | undefined {
    if (typeof obj !== 'object' || obj === null) {
      return undefined;
    }
    const str = JSON.stringify(obj);
    const parsed: unknown = JSON.parse(str);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      // Create a new object to ensure proper typing
      const result: Record<string, unknown> = {};
      for (const key in parsed) {
        if (Object.prototype.hasOwnProperty.call(parsed, key)) {
          result[key] = Object.getOwnPropertyDescriptor(parsed, key)?.value;
        }
      }
      return result;
    }
    return undefined;
  }

  private mapProjectState(state: unknown): Project["state"] {
    if (typeof state !== 'string') {
      return "ACTIVE";
    }
    
    switch (state) {
      case "ACTIVE":
      case "DELETE_REQUESTED":
      case "DELETE_IN_PROGRESS":
        return state;
      default:
        return "ACTIVE";
    }
  }

  private mapErrorCode(code: number | undefined): CloudLoggingError["code"] {
    switch (code) {
      case 3:
        return "INVALID_ARGUMENT";
      case 5:
        return "NOT_FOUND";
      case 7:
        return "PERMISSION_DENIED";
      case 13:
        return "INTERNAL";
      case 14:
        return "UNAVAILABLE";
      case 16:
        return "UNAUTHENTICATED";
      case undefined:
        return "INTERNAL";
      default:
        return "INTERNAL";
    }
  }

  async listProjects(params: ListProjectsInput): Promise<ListProjectsOutput> {
    try {
      const [projects, , response] = await this.projectsClient.searchProjects({
        query: params.filter,
        pageSize: params.pageSize,
        pageToken: params.pageToken,
      });

      const mappedProjects: Project[] = projects.map((project) => ({
        projectId: project.projectId ?? "",
        name: project.name ?? "",
        displayName: project.displayName ?? undefined,
        state: this.mapProjectState(project.state),
        createTime: typeof project.createTime === 'string' ? project.createTime : new Date().toISOString(),
        updateTime: typeof project.updateTime === 'string' ? project.updateTime : undefined,
      }));

      return {
        projects: mappedProjects,
        nextPageToken: response?.nextPageToken ?? undefined,
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : { message: String(error) };
      throw new Error(`Failed to list projects: ${errorObj.message ?? 'Unknown error'}`);
    }
  }
}
