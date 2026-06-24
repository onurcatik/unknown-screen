import type { UUIDString } from "@shared/model/api";

export const queryKeys = {
  templates: ["templates"] as const,
  models: ["models"] as const,
  projects: ["projects"] as const,
  project: (projectId: UUIDString) => ["projects", projectId] as const,
  projectTimelineValidation: (projectId: UUIDString) => ["projects", projectId, "timeline", "validation"] as const,
  job: (jobId: UUIDString) => ["jobs", jobId] as const,
  jobEvents: (jobId: UUIDString, afterEventId: number) => ["jobs", jobId, "events", afterEventId] as const,
  backendHealth: ["backend-health"] as const,
};
