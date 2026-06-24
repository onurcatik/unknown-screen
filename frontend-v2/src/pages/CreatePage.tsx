import { CreateProjectForm } from "@features/create-project";
import { Alert, PageHeader } from "@shared/ui";

export function CreatePage() {
  return (
    <div className="page-stack create-page">
      <PageHeader
        eyebrow="Phase 8 create flow"
        title="Create scene plan"
        description="Build a backend-backed project plan from a subject, template, model, platform, duration, voice style, and caption style. The primary flow uses POST /api/projects and routes to Studio after success."
      />
      <Alert title="Backend-bound flow" tone="info">
        Templates and models are loaded from the existing Flask API. Submit does not call legacy /api/generate and does not create local mock projects.
      </Alert>
      <CreateProjectForm />
    </div>
  );
}
