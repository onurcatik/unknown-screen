import { Link } from "react-router-dom";
import { Alert, EmptyState, PageHeader } from "@shared/ui";

export function RendersPage() {
  return (
    <div className="page-stack renders-page">
      <PageHeader
        eyebrow="Phase 10 boundary"
        title="Render Observatory lives inside Studio"
        description="The current Flask backend exposes job detail and job events by job id, but it does not expose a global list-jobs endpoint. This page therefore stays honest instead of showing fake render history."
      />
      <Alert title="No fake global job history" tone="warning">
        Open a project from Dashboard and use its Studio panel to validate timeline, queue render, poll active job state, stream incremental events, cancel jobs, and preview the result.
      </Alert>
      <EmptyState
        eyebrow="Backend limitation"
        title="Global render history is not supported by the current backend."
        description="Render state is tracked from a project activeRenderJobId or from a newly queued jobId. Adding a global history table would require backend changes, which are outside this frontend-only phase."
        action={<Link className="primary-link" to="/dashboard">Open Dashboard</Link>}
      />
    </div>
  );
}
