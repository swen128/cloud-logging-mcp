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
    if (this.defaultProjectId) {
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
      const request: any = {
        projectIds: [params.projectId],
        filter: params.filter,
        pageSize: params.pageSize || 100,
        pageToken: params.pageToken,
        orderBy: params.orderBy ? `timestamp ${params.orderBy.timestamp}` : "timestamp desc",
      };

      if (params.resourceNames) {
        request.resourceNames = params.resourceNames;
      }

      const [entries, , response] = await this.logging.getEntries(request);

      const rawEntries: RawLogEntry[] = entries.map((entry) => {
        const metadata = entry.metadata || {};
        const data = entry.data || {};

        let timestamp: string;
        if (metadata.timestamp) {
          if (typeof metadata.timestamp === 'string') {
            timestamp = metadata.timestamp;
          } else if (metadata.timestamp instanceof Date) {
            timestamp = metadata.timestamp.toISOString();
          } else if (typeof metadata.timestamp === 'object' && 'seconds' in metadata.timestamp) {
            // Handle Google protobuf Timestamp
            const seconds = (metadata.timestamp as any).seconds;
            timestamp = new Date(Number(seconds) * 1000).toISOString();
          } else {
            timestamp = new Date().toISOString();
          }
        } else {
          timestamp = new Date().toISOString();
        }

        return {
          insertId: createLogId(metadata.insertId || ""),
          timestamp,
          severity: (metadata.severity || "DEFAULT") as LogSeverity,
          jsonPayload: typeof data === "object" && !Buffer.isBuffer(data) ? data : undefined,
          textPayload: typeof data === "string" ? data : Buffer.isBuffer(data) ? data.toString() : undefined,
          protoPayload: metadata.protoPayload ? (metadata.protoPayload as Record<string, unknown>) : undefined,
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
        nextPageToken: response?.nextPageToken || undefined,
      });
    } catch (error: any) {
      const cloudError: CloudLoggingError = {
        message: error.message || "Unknown error occurred",
        code: this.mapErrorCode(error.code),
      };
      return err(cloudError);
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
        projectId: project.projectId || "",
        name: project.name || "",
        displayName: project.displayName || undefined,
        state: project.state as Project["state"] || "ACTIVE",
        createTime: typeof project.createTime === 'string' ? project.createTime : new Date().toISOString(),
        updateTime: typeof project.updateTime === 'string' ? project.updateTime : undefined,
      }));

      return {
        projects: mappedProjects,
        nextPageToken: response?.nextPageToken || undefined,
      };
    } catch (error: any) {
      throw new Error(`Failed to list projects: ${error.message}`);
    }
  }
}
