import type {
  CreateProjectRequest,
  CreateProjectResponse,
  ProjectResponse,
  ProjectsResponse,
  SaveTimelineResponse,
} from "@entities/project/model";
import type { TemplatesResponse } from "@entities/template/model";
import type { SaveTimelineRequest, Timeline, ValidateTimelineResponse } from "@entities/timeline/model";
import { toBackendTimeline } from "@entities/timeline/model";
import type {
  CancelJobResponse,
  JobEventsResponse,
  JobResponse,
  RenderProjectRequest,
  RenderProjectResponse,
} from "@entities/job/model";
import type { ModelsResponse } from "@entities/model/model";
import type { ApiSuccessResponse, UUIDString } from "@shared/model/api";
import { apiRequest, buildBackendFileUrl } from "./http-client";

export type UploadSongsResponse = ApiSuccessResponse<{
  message: string;
}>;

export type LegacyGenerateRequest = {
  videoSubject: string;
  [key: string]: unknown;
};

export type LegacyGenerateResponse = ApiSuccessResponse<{
  message: string;
  jobId: UUIDString;
}>;

export type LegacyCancelResponse = ApiSuccessResponse<{
  message: string;
  jobId: UUIDString;
}>;

export const api = {
  getTemplates(signal?: AbortSignal): Promise<TemplatesResponse> {
    return apiRequest<TemplatesResponse>("/api/templates", { signal });
  },

  getProjects(signal?: AbortSignal): Promise<ProjectsResponse> {
    return apiRequest<ProjectsResponse>("/api/projects", { signal });
  },

  createProject(input: CreateProjectRequest, signal?: AbortSignal): Promise<CreateProjectResponse> {
    return apiRequest<CreateProjectResponse>("/api/projects", {
      method: "POST",
      body: input,
      signal,
    });
  },

  getProject(projectId: UUIDString, signal?: AbortSignal): Promise<ProjectResponse> {
    return apiRequest<ProjectResponse>(`/api/projects/${encodeURIComponent(projectId)}`, { signal });
  },

  saveTimeline(projectId: UUIDString, timeline: Timeline, signal?: AbortSignal): Promise<SaveTimelineResponse> {
    const body: SaveTimelineRequest = { timeline: toBackendTimeline(timeline) };
    return apiRequest<SaveTimelineResponse>(`/api/projects/${encodeURIComponent(projectId)}/timeline`, {
      method: "PUT",
      body,
      signal,
    });
  },

  validateTimeline(projectId: UUIDString, timeline?: Timeline, signal?: AbortSignal): Promise<ValidateTimelineResponse> {
    return apiRequest<ValidateTimelineResponse>(`/api/projects/${encodeURIComponent(projectId)}/timeline/validate`, {
      method: "POST",
      body: typeof timeline === "undefined" ? {} : { timeline: toBackendTimeline(timeline) },
      signal,
    });
  },

  renderProject(
    projectId: UUIDString,
    options: RenderProjectRequest,
    signal?: AbortSignal,
  ): Promise<RenderProjectResponse> {
    return apiRequest<RenderProjectResponse>(`/api/projects/${encodeURIComponent(projectId)}/render`, {
      method: "POST",
      body: options,
      signal,
    });
  },

  getJob(jobId: UUIDString, signal?: AbortSignal): Promise<JobResponse> {
    return apiRequest<JobResponse>(`/api/jobs/${encodeURIComponent(jobId)}`, { signal });
  },

  getJobEvents(jobId: UUIDString, afterEventId = 0, signal?: AbortSignal): Promise<JobEventsResponse> {
    const search = new URLSearchParams({ after: String(Math.max(0, afterEventId)) });
    return apiRequest<JobEventsResponse>(`/api/jobs/${encodeURIComponent(jobId)}/events?${search.toString()}`, { signal });
  },

  cancelJob(jobId: UUIDString, signal?: AbortSignal): Promise<CancelJobResponse> {
    return apiRequest<CancelJobResponse>(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
      body: {},
      signal,
    });
  },

  getModels(signal?: AbortSignal): Promise<ModelsResponse> {
    return apiRequest<ModelsResponse>("/api/models", { signal });
  },

  uploadSongs(files: File[], signal?: AbortSignal): Promise<UploadSongsResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append("songs", file));
    return apiRequest<UploadSongsResponse>("/api/upload-songs", {
      method: "POST",
      formData,
      signal,
    });
  },

  legacyGenerate(input: LegacyGenerateRequest, signal?: AbortSignal): Promise<LegacyGenerateResponse> {
    return apiRequest<LegacyGenerateResponse>("/api/generate", {
      method: "POST",
      body: input,
      signal,
    });
  },

  legacyCancel(signal?: AbortSignal): Promise<LegacyCancelResponse> {
    return apiRequest<LegacyCancelResponse>("/api/cancel", {
      method: "POST",
      body: {},
      signal,
    });
  },

  buildFileUrl(relativePathOrUrl: string | null | undefined): string | null {
    return buildBackendFileUrl(relativePathOrUrl);
  },
};
