import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { StatusBadge } from "@entities/project/ui";
import type { Timeline } from "@entities/timeline/model";
import { TimelineEditor } from "@features/timeline-editor";
import { api, getUserFacingApiError, queryKeys } from "@shared/api";
import { formatDateTime, formatDurationSeconds, humanizeIdentifier } from "@shared/lib";
import { Alert, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Skeleton, useToast } from "@shared/ui";

export function StudioWorkspace() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const projectQuery = useQuery({
    queryKey: projectId ? queryKeys.project(projectId) : ["project", "missing-id"],
    queryFn: ({ signal }) => {
      if (!projectId) {
        throw new Error("Project id route parameter is missing.");
      }
      return api.getProject(projectId, signal);
    },
    enabled: Boolean(projectId),
  });

  const saveTimelineMutation = useMutation({
    mutationFn: (timeline: Timeline) => {
      if (!projectId) {
        throw new Error("Project id route parameter is missing.");
      }
      return api.saveTimeline(projectId, timeline);
    },
    onSuccess: (response) => {
      if (!projectId) return;
      queryClient.setQueryData(queryKeys.project(projectId), response);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      showToast({ tone: "success", title: "Timeline saved", description: response.message ?? "Project timeline was saved." });
    },
    onError: (error) => {
      const message = getUserFacingApiError(error);
      showToast({ tone: "danger", title: "Could not save timeline", description: message });
    },
  });

  if (!projectId) {
    return (
      <EmptyState
        eyebrow="Missing route parameter"
        title="Studio needs a project id."
        description="Open a project from Dashboard or create a scene plan first."
        action={<Link className="primary-link" to="/dashboard">Back to Dashboard</Link>}
      />
    );
  }

  if (projectQuery.isLoading) {
    return <StudioSkeleton />;
  }

  if (projectQuery.isError) {
    const message = getUserFacingApiError(projectQuery.error);
    return (
      <Alert title="Project detail failed to load" tone="danger">
        <p>{message}</p>
        <div className="dashboard-alert-actions">
          <Button variant="secondary" onClick={() => projectQuery.refetch()}>Retry</Button>
          <Link className="primary-link" to="/dashboard">Back to Dashboard</Link>
        </div>
      </Alert>
    );
  }

  const project = projectQuery.data?.project;

  if (!project) {
    return (
      <EmptyState
        eyebrow="No project data"
        title="The backend response did not include a project."
        description="Studio does not create local fallback projects. Retry the API request or return to Dashboard."
        action={<Button variant="secondary" onClick={() => projectQuery.refetch()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="studio-workspace">
      <Card>
        <CardHeader>
          <div className="studio-project-header">
            <div>
              <div className="studio-project-kicker">
                <Badge tone="accent">{humanizeIdentifier(project.templateId)}</Badge>
                <StatusBadge status={project.status} />
              </div>
              <CardTitle>{project.subject}</CardTitle>
              <CardDescription>
                Timeline edits are saved through PUT /api/projects/:projectId/timeline. Backend remains the source of truth.
              </CardDescription>
            </div>
            <div className="studio-project-actions">
              <Link className="primary-link" to="/dashboard">Dashboard</Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="studio-project-meta-grid">
            <div>
              <dt>Project ID</dt>
              <dd>{project.id}</dd>
            </div>
            <div>
              <dt>Platform</dt>
              <dd>{humanizeIdentifier(project.platform)}</dd>
            </div>
            <div>
              <dt>Target duration</dt>
              <dd>{formatDurationSeconds(project.targetDuration)}</dd>
            </div>
            <div>
              <dt>Scene count</dt>
              <dd>{project.timeline?.scenes.length ?? 0}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDateTime(project.updatedAt)}</dd>
            </div>
            <div>
              <dt>Active render job</dt>
              <dd>{project.metadata?.activeRenderJobId ?? "None"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <TimelineEditor
        project={project}
        isSaving={saveTimelineMutation.isPending}
        onSave={(timeline) => saveTimelineMutation.mutate(timeline)}
      />
    </div>
  );
}

function StudioSkeleton() {
  return (
    <div className="studio-workspace">
      <Card>
        <CardHeader>
          <Skeleton style={{ width: "42%", height: 22 }} />
          <Skeleton style={{ width: "74%", height: 18 }} />
        </CardHeader>
        <CardContent>
          <div className="studio-project-meta-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} style={{ height: 58 }} />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="studio-workspace-grid">
        <div className="studio-editor-column">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} style={{ height: 260 }} />
          ))}
        </div>
        <Skeleton style={{ height: 360 }} />
      </div>
    </div>
  );
}
