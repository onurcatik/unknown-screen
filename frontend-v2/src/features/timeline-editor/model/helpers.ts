import type { VideoProject } from "@entities/project/model";
import type { Timeline, TimelineScene } from "@entities/timeline/model";
import { getSceneVisualQuery, toBackendTimeline, toBackendTimelineScene } from "@entities/timeline/model";

export const MIN_SCENE_DURATION_SECONDS = 2;
export const MAX_SCENE_DURATION_SECONDS = 14;
export const CAPTION_WARNING_LIMIT = 92;

export type TimelineEditWarning = {
  field: "voiceover" | "caption" | "visual_query" | "duration" | "scene";
  message: string;
};

export type TimelineSceneWithWarnings = TimelineScene & {
  editWarnings?: TimelineEditWarning[];
};

export function cloneTimelineForEditing(timeline: Timeline): Timeline {
  return toBackendTimeline({
    ...timeline,
    scenes: timeline.scenes.map((scene, index) => toBackendTimelineScene(scene, index + 1)),
  });
}

export function createSceneDraft(index: number, project: VideoProject): TimelineScene {
  const subject = project.subject?.trim() || "project subject";
  return {
    index,
    purpose: "value_point",
    duration: 5,
    voiceover: "Draft the next voiceover line here.",
    caption: "Draft caption",
    visual_query: subject,
    transition: "quick_cut",
  };
}

export function normalizeTimelineBeforeSave(timeline: Timeline): Timeline {
  return toBackendTimeline({
    ...timeline,
    scenes: timeline.scenes.map((scene, index) => toBackendTimelineScene(scene, index + 1)),
  });
}

export function getTimelineFingerprint(timeline: Timeline | null | undefined): string {
  if (!timeline) {
    return "";
  }
  return JSON.stringify(normalizeTimelineBeforeSave(timeline));
}

export function moveScene(scenes: TimelineScene[], fromIndex: number, toIndex: number): TimelineScene[] {
  if (toIndex < 0 || toIndex >= scenes.length || fromIndex === toIndex) {
    return scenes;
  }
  const next = [...scenes];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next.map((scene, index) => toBackendTimelineScene(scene, index + 1));
}

export function removeScene(scenes: TimelineScene[], index: number): TimelineScene[] {
  if (scenes.length <= 1) {
    return scenes;
  }
  return scenes.filter((_, sceneIndex) => sceneIndex !== index).map((scene, sceneIndex) => toBackendTimelineScene(scene, sceneIndex + 1));
}

export function getTimelineStats(timeline: Timeline) {
  const sceneCount = timeline.scenes.length;
  const totalDuration = timeline.scenes.reduce((total, scene) => {
    const duration = typeof scene.duration === "number" && Number.isFinite(scene.duration) ? scene.duration : 0;
    return total + duration;
  }, 0);
  const voiceoverCharacters = timeline.scenes.reduce((total, scene) => total + String(scene.voiceover ?? "").length, 0);
  const captionCharacters = timeline.scenes.reduce((total, scene) => total + String(scene.caption ?? "").length, 0);
  return { sceneCount, totalDuration, voiceoverCharacters, captionCharacters };
}

export function getSceneEditWarnings(scene: TimelineScene): TimelineEditWarning[] {
  const warnings: TimelineEditWarning[] = [];
  const voiceover = String(scene.voiceover ?? "").trim();
  const caption = String(scene.caption ?? "").trim();
  const visualQuery = getSceneVisualQuery(scene).trim();
  const duration = typeof scene.duration === "number" ? scene.duration : Number(scene.duration);

  if (!voiceover) {
    warnings.push({ field: "voiceover", message: "Voiceover is empty; backend validation may reject this scene." });
  }

  if (!caption) {
    warnings.push({ field: "caption", message: "Caption is empty; the rendered short may lose the main on-screen hook." });
  }

  if (caption.length > CAPTION_WARNING_LIMIT) {
    warnings.push({ field: "caption", message: `Caption is ${caption.length} characters; keep shorts captions under ${CAPTION_WARNING_LIMIT} characters when possible.` });
  }

  if (!visualQuery) {
    warnings.push({ field: "visual_query", message: "visual_query is empty; backend asset matching needs a specific visual target." });
  }

  if (!Number.isFinite(duration) || duration < MIN_SCENE_DURATION_SECONDS || duration > MAX_SCENE_DURATION_SECONDS) {
    warnings.push({
      field: "duration",
      message: `Duration should stay between ${MIN_SCENE_DURATION_SECONDS}-${MAX_SCENE_DURATION_SECONDS} seconds for the backend timeline adapter.`,
    });
  }

  return warnings;
}

export function hasBlockingEditIssue(timeline: Timeline | null): boolean {
  if (!timeline || timeline.scenes.length === 0) {
    return true;
  }
  return timeline.scenes.some((scene) => {
    const duration = typeof scene.duration === "number" ? scene.duration : Number(scene.duration);
    return !String(scene.voiceover ?? "").trim() || !String(scene.caption ?? "").trim() || !String(getSceneVisualQuery(scene)).trim() || !Number.isFinite(duration);
  });
}
