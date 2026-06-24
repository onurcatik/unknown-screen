import type { RenderJob, RenderJobEvent, RenderOptions } from "@entities/job/model";
import { DEFAULT_RENDER_OPTIONS, isTerminalJobState } from "@entities/job/model";
import type { VideoProject } from "@entities/project/model";
import { getActiveRenderJobId } from "@entities/project/model";
import type { TimelineRenderSummary } from "@entities/timeline/model";
import { hasRenderableScenes } from "@entities/timeline/model";
import { formatDurationSeconds, humanizeIdentifier } from "@shared/lib";

export type ValidationGate = {
  canValidate: boolean;
  canQueueRender: boolean;
  reason: string | null;
};

export function createDefaultRenderOptions(): Required<RenderOptions> {
  return { ...DEFAULT_RENDER_OPTIONS };
}


export function clampRenderThreads(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_RENDER_OPTIONS.threads ?? 2;
  }
  return Math.min(8, Math.max(1, Math.round(value)));
}

export function normalizeRenderColor(value: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : DEFAULT_RENDER_OPTIONS.color ?? "#FFFF00";
}

export function normalizeRenderVoice(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_RENDER_OPTIONS.voice ?? "en_us_001";
}

export function sanitizeRenderOptions(options: Required<RenderOptions>): Required<RenderOptions> {
  return {
    ...options,
    voice: normalizeRenderVoice(options.voice),
    color: normalizeRenderColor(options.color),
    threads: clampRenderThreads(options.threads),
  };
}

export function getInitialRenderJobId(project: VideoProject): string | null {
  return getActiveRenderJobId(project);
}

export function getValidationGate(project: VideoProject, isTimelineDirty: boolean): ValidationGate {
  if (!hasRenderableScenes(project.timeline)) {
    return {
      canValidate: false,
      canQueueRender: false,
      reason: "This project has no saved backend timeline. Create and save a timeline before validation or render.",
    };
  }

  if (isTimelineDirty) {
    return {
      canValidate: false,
      canQueueRender: false,
      reason: "Save timeline edits first. Validation and render use the backend timeline, not the local edit buffer.",
    };
  }

  return {
    canValidate: true,
    canQueueRender: true,
    reason: null,
  };
}

export function summarizeValidation(summary: TimelineRenderSummary | null): string {
  if (!summary) {
    return "No validation result yet.";
  }

  return `${summary.sceneCount} scenes · ${formatDurationSeconds(summary.totalDuration)} · ${humanizeIdentifier(summary.platform)} · ${humanizeIdentifier(summary.templateId)}`;
}

export function validationHasBlockingErrors(summary: TimelineRenderSummary | null): boolean {
  if (!summary) {
    return false;
  }

  return !Number.isFinite(summary.sceneCount) || summary.sceneCount <= 0 || !Number.isFinite(summary.totalDuration) || summary.totalDuration <= 0;
}

export function getJobTone(job: RenderJob | null | undefined): "neutral" | "accent" | "success" | "warning" | "danger" {
  if (!job) {
    return "neutral";
  }

  if (job.state === "completed") {
    return "success";
  }

  if (job.state === "failed") {
    return "danger";
  }

  if (job.state === "cancelled") {
    return "warning";
  }

  if (job.state === "running") {
    return "accent";
  }

  return "neutral";
}

export function getEventTone(event: RenderJobEvent): "neutral" | "accent" | "success" | "warning" | "danger" {
  if (event.level === "success" || event.type === "complete") {
    return "success";
  }

  if (event.level === "warning" || event.type === "cancel_requested" || event.type === "cancelled") {
    return "warning";
  }

  if (event.level === "error" || event.type === "error") {
    return "danger";
  }

  if (event.type === "running") {
    return "accent";
  }

  return "neutral";
}

export function mergeJobEvents(current: RenderJobEvent[], incoming: RenderJobEvent[]): RenderJobEvent[] {
  const seen = new Map<number, RenderJobEvent>();
  current.forEach((event) => seen.set(event.id, event));
  incoming.forEach((event) => seen.set(event.id, event));
  return Array.from(seen.values()).sort((a, b) => a.id - b.id);
}

export function getLastEventId(events: RenderJobEvent[]): number {
  return events.reduce((max, event) => Math.max(max, Number.isFinite(event.id) ? event.id : 0), 0);
}

export function shouldPollJob(job: RenderJob | null | undefined): boolean {
  return Boolean(job && !isTerminalJobState(job.state));
}
