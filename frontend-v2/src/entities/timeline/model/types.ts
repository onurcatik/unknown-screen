import type { ApiSuccessResponse, UnknownRecord, UUIDString } from "../../../shared/model/api";
import type { CaptionStyle, TemplateId } from "../../template/model/types";

export type PlatformId =
  | "youtube_shorts"
  | "instagram_reels"
  | "tiktok"
  | "youtube"
  | "shorts"
  | "reels"
  | "instagram"
  | "tik_tok"
  | (string & {});

export type VoiceStyle =
  | "neutral"
  | "direct"
  | "storytelling"
  | "suspenseful"
  | "urgent"
  | "intense"
  | "educational"
  | "persuasive"
  | (string & {});

export type ScenePurpose =
  | "hook"
  | "value_point"
  | "proof"
  | "reveal"
  | "cta"
  | (string & {});

export type VisualType = "stock_video" | "image" | "fallback_color" | (string & {});
export type SceneTransition = "quick_cut" | "hard_cut" | "fade" | (string & {});

export type TimelineScene = {
  index?: number;
  purpose?: ScenePurpose;
  duration?: number;
  voiceover?: string;
  caption?: string;
  visual_query?: string;
  visualQuery?: string;
  visual_type?: VisualType;
  transition?: SceneTransition;
  notes?: string;
  warnings?: string[];
  [key: string]: unknown;
};

export type TimelineMetadata = UnknownRecord & {
  generation_mode?: "fallback" | "llm" | (string & {});
  warning?: string | null;
  source?: string;
  template?: UnknownRecord;
};

export type Timeline = {
  project_id?: UUIDString | null;
  topic?: string;
  template_id?: TemplateId;
  template_name?: string;
  language?: string;
  platform?: PlatformId;
  target_duration?: number;
  voice_style?: VoiceStyle;
  caption_style?: CaptionStyle;
  hook?: string;
  summary?: string;
  scenes: TimelineScene[];
  metadata?: TimelineMetadata | null;
  [key: string]: unknown;
};

export type TimelineRenderSummary = {
  sceneCount: number;
  totalDuration: number;
  warnings: string[];
  qualityWarnings: string[];
  platform: PlatformId;
  templateId: TemplateId;
  captionStyle: CaptionStyle;
};

export type SaveTimelineRequest = {
  timeline: Timeline;
};

export type ValidateTimelineRequest = {
  timeline?: Timeline;
};

export type ValidateTimelineResponse = ApiSuccessResponse<{
  message: string;
  summary: TimelineRenderSummary;
}>;

export function getSceneVisualQuery(scene: TimelineScene): string {
  const value = scene.visual_query ?? scene.visualQuery;
  return typeof value === "string" ? value : "";
}

export function toBackendTimelineScene(scene: TimelineScene, index?: number): TimelineScene {
  const visualQuery = getSceneVisualQuery(scene);
  const next: TimelineScene = {
    ...scene,
    ...(typeof index === "number" ? { index } : {}),
    visual_query: visualQuery,
  };
  delete next.visualQuery;
  return next;
}

export function toBackendTimeline(timeline: Timeline): Timeline {
  return {
    ...timeline,
    scenes: Array.isArray(timeline.scenes)
      ? timeline.scenes.map((scene, itemIndex) => toBackendTimelineScene(scene, itemIndex + 1))
      : [],
  };
}

export function hasRenderableScenes(timeline: Timeline | null | undefined): timeline is Timeline {
  return Boolean(timeline && Array.isArray(timeline.scenes) && timeline.scenes.length > 0);
}
