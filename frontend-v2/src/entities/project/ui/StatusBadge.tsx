import { Badge } from "@shared/ui";
import type { BadgeProps } from "@shared/ui";
import type { ProjectStatus } from "../model";

type StatusConfig = {
  label: string;
  tone: NonNullable<BadgeProps["tone"]>;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  draft: { label: "Draft", tone: "neutral" },
  planned: { label: "Planned", tone: "accent" },
  editing: { label: "Editing", tone: "warning" },
  render_queued: { label: "Render queued", tone: "success" },
};

function fallbackStatusLabel(status: ProjectStatus): string {
  return String(status || "unknown")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase()) || "Unknown";
}

export interface StatusBadgeProps {
  status: ProjectStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[String(status)] ?? {
    label: fallbackStatusLabel(status),
    tone: "neutral" as const,
  };

  return <Badge tone={config.tone}>{config.label}</Badge>;
}
