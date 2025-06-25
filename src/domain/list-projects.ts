import { z } from "zod";
import type { CloudLoggingApi } from "./api.js";
import { ok, err, Result } from "neverthrow";

const ProjectSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  displayName: z.string().optional(),
  state: z.enum(["ACTIVE", "DELETE_REQUESTED", "DELETE_IN_PROGRESS"]),
  createTime: z.string(),
  updateTime: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

export interface ListProjectsInput {
  filter?: string;
  pageSize?: number;
  pageToken?: string;
}

export interface ListProjectsOutput {
  projects: Project[];
  nextPageToken?: string;
}

export const listProjects =
  (api: CloudLoggingApi) =>
  async (
    input: ListProjectsInput
  ): Promise<Result<ListProjectsOutput, Error>> => {
    try {
      const projects = await api.listProjects(input);
      return ok(projects);
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };