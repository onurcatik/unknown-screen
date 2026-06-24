import type { Timeline } from "@entities/timeline/model";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/ui";
import { formatDurationSeconds, humanizeIdentifier } from "@shared/lib";
import { getTimelineStats } from "../model";

interface TimelineStatsPanelProps {
  timeline: Timeline;
}

export function TimelineStatsPanel({ timeline }: TimelineStatsPanelProps) {
  const stats = getTimelineStats(timeline);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline contract</CardTitle>
        <CardDescription>Read-only backend-facing timeline metadata.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="studio-contract-grid">
          <div>
            <dt>Scenes</dt>
            <dd>{stats.sceneCount}</dd>
          </div>
          <div>
            <dt>Total duration</dt>
            <dd>{formatDurationSeconds(stats.totalDuration)}</dd>
          </div>
          <div>
            <dt>Platform</dt>
            <dd>{humanizeIdentifier(timeline.platform)}</dd>
          </div>
          <div>
            <dt>Template</dt>
            <dd>{humanizeIdentifier(timeline.template_id)}</dd>
          </div>
          <div>
            <dt>Caption style</dt>
            <dd>{humanizeIdentifier(timeline.caption_style)}</dd>
          </div>
          <div>
            <dt>Language</dt>
            <dd>{timeline.language || "Not set"}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
