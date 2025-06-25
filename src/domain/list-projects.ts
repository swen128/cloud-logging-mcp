import { z } from "zod";

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