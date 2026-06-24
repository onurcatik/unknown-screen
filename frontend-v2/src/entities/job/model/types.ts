import type {
  ApiSuccessResponse,
  BackendFileUrl,
  ISODateString,
  RelativeBackendPath,
  UnknownRecord,
  UUIDString,
} from "../../../shared/model/api";
import type { TimelineRenderSummary } from "../../timeline/model/types";
import type { VideoProject } from "../../project/model/types";

export type KnownJobState = "queued" | "running" | "completed" | "failed" | "cancelled";
export type JobState = KnownJobState | (string & {});

export type JobEventLevel = "info" | "success" | "warning" | "error" | (string & {});
export type JobEventType =
  | "queued"
  | "running"
  | "complete"
  | "error"
  | "cancel_requested"
  | "cancelled"
  | "log"
  | (string & {});

export type RenderJob = {
  id: UUIDString;
  state: JobState;
  cancelRequested: boolean;
  resultPath: RelativeBackendPath | null;
  resultUrl: BackendFileUrl | null;
  errorMessage: string | null;
  createdAt: ISODateString | null;
  startedAt: ISODateString | null;
  completedAt: ISODateString | null;
};

export type RenderJobEvent = {
  id: number;
  type: JobEventType;
  level: JobEventLevel;
  message: string;
  payload: UnknownRecord | null;
  timestamp: number | null;
};

export type RenderOptions = {
  voice?: string;
  subtitlesPosition?: string;
  color?: string;
  threads?: number;
  useMusic?: boolean;
};

export const DEFAULT_RENDER_OPTIONS: Required<RenderOptions> = {
  voice: "en_us_001",
  subtitlesPosition: "center,bottom",
  color: "#FFFF00",
  threads: 2,
  useMusic: false,
};

export type RenderProjectRequest = RenderOptions;

export type RenderProjectResponse = ApiSuccessResponse<{
  message: string;
  jobId: UUIDString;
  summary: TimelineRenderSummary;
  project: VideoProject;
}>;

export type JobResponse = ApiSuccessResponse<{
  job: RenderJob;
}>;

export type JobEventsResponse = ApiSuccessResponse<{
  events: RenderJobEvent[];
}>;

export type CancelJobResponse = ApiSuccessResponse<{
  message: string;
}>;

export function isTerminalJobState(state: JobState): boolean {
  return state === "completed" || state === "failed" || state === "cancelled";
}

export function isActiveJobState(state: JobState): boolean {
  return state === "queued" || state === "running";
}

export function shouldShowResult(job: RenderJob): boolean {
  if (job.state !== "completed") {
    return false;
  }
  return Boolean(job.resultUrl || job.resultPath);
}
