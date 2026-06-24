import { Link } from "react-router-dom";
import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from "@shared/ui";
import { formatDateTime, formatDurationSeconds, humanizeIdentifier } from "@shared/lib";
import { getActiveRenderJobId, isProjectEditable, type VideoProject } from "../model";
import { StatusBadge } from "./StatusBadge";

export interface ProjectCardProps {
  project: VideoProject;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const activeJobId = getActiveRenderJobId(project);
  const isEditable = isProjectEditable(project.status);

  return (
    <Card className="project-card">
      <CardHeader className="project-card-header">
        <div className="project-card-heading">
          <CardTitle>{project.subject || "Untitled project"}</CardTitle>
          <StatusBadge status={project.status} />
        </div>
        <dl className="project-meta-grid" aria-label="Project metadata">
          <div>
            <dt>Template</dt>
            <dd>{humanizeIdentifier(project.templateId)}</dd>
          </div>
          <div>
            <dt>Platform</dt>
            <dd>{humanizeIdentifier(project.platform)}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>{formatDurationSeconds(project.targetDuration)}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDateTime(project.updatedAt ?? project.createdAt)}</dd>
          </div>
        </dl>
      </CardHeader>
      <CardContent>
        <div className="project-signal-row">
          <span>{project.timeline?.scenes?.length ?? 0} scene plan</span>
          <span>{project.language || "Language unknown"}</span>
          {activeJobId ? <span>Active render job linked</span> : <span>No active render job</span>}
        </div>
      </CardContent>
      <CardFooter>
        <Link to={`/studio/${encodeURIComponent(project.id)}`} className="ui-button ui-button-secondary ui-button-md">
          {isEditable ? "Continue in Studio" : "Open Studio"}
        </Link>
        {activeJobId ? (
          <Link to="/renders" className="ui-button ui-button-ghost ui-button-md">
            View render
          </Link>
        ) : null}
        <Button variant="ghost" size="sm" disabled title="Project actions are not available until later phases.">
          Actions later
        </Button>
      </CardFooter>
    </Card>
  );
}
