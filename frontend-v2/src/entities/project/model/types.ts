import type { ApiSuccessResponse, ISODateString, UnknownRecord, UUIDString } from "../../../shared/model/api";
import type { PlatformId, Timeline, VoiceStyle } from "../../timeline/model/types";
import type { CaptionStyle, TemplateId } from "../../template/model/types";

export type KnownProjectStatus = "draft" | "planned" | "editing" | "render_queued";
export type ProjectStatus = KnownProjectStatus | (string & {});

export type ProjectMetadata = UnknownRecord & {
  source?: string;
  activeRenderJobId?: UUIDString;
  timelineRenderWarnings?: string[];
};

export type VideoProject = {
  id: UUIDString;
  subject: string;
  templateId: TemplateId;
  language: string;
  platform: PlatformId;
  targetDuration: number;
  voiceStyle: VoiceStyle | null;
  captionStyle: CaptionStyle | null;
  status: ProjectStatus;
  timeline: Timeline | null;
  metadata: ProjectMetadata | null;
  createdAt: ISODateString | null;
  updatedAt: ISODateString | null;
};

export type ProjectsResponse = ApiSuccessResponse<{
  projects: VideoProject[];
}>;

export type ProjectResponse = ApiSuccessResponse<{
  project: VideoProject;
}>;

export type CreateProjectRequest = {
  videoSubject?: string;
  subject?: string;
  templateId?: TemplateId;
  language?: string;
  platform?: PlatformId;
  targetDuration?: number;
  duration?: number;
  voiceStyle?: VoiceStyle;
  voice?: string;
  captionStyle?: CaptionStyle;
  aiModel?: string;
};

export type CreateProjectResponse = ApiSuccessResponse<{
  message: string;
  project: VideoProject;
}>;

export type SaveTimelineResponse = ApiSuccessResponse<{
  message: string;
  project: VideoProject;
}>;

export function isProjectEditable(status: ProjectStatus): boolean {
  return status === "draft" || status === "planned" || status === "editing" || status === "render_queued";
}

export function getActiveRenderJobId(project: VideoProject): string | null {
  const value = project.metadata?.activeRenderJobId;
  return typeof value === "string" && value ? value : null;
}
