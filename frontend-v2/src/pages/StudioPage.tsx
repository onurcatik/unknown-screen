import { StudioWorkspace } from "@widgets/studio";
import { Alert, PageHeader } from "@shared/ui";

export function StudioPage() {
  return (
    <div className="page-stack studio-page">
      <PageHeader
        eyebrow="Phase 10 studio"
        title="Timeline Studio + Render Observatory"
        description="Edit the backend timeline, validate the saved timeline, queue render jobs, poll job state, read incremental events, cancel active jobs, and preview completed output without changing backend code."
      />
      <Alert title="Backend-owned render pipeline" tone="info">
        Studio reads GET /api/projects/:projectId, saves PUT /api/projects/:projectId/timeline, validates POST /timeline/validate, queues POST /render, polls GET /api/jobs/:jobId, streams GET /events?after=:eventId, and cancels POST /cancel.
      </Alert>
      <StudioWorkspace />
    </div>
  );
}
