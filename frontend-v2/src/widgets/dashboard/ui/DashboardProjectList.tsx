import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, getUserFacingApiError, queryKeys } from "@shared/api";
import { Alert, Button, Card, CardContent, EmptyState, Skeleton } from "@shared/ui";
import { ProjectCard } from "@entities/project";

function ProjectListSkeleton() {
  return (
    <div className="dashboard-grid" aria-label="Loading projects">
      <Skeleton style={{ height: 214 }} />
      <Skeleton style={{ height: 214 }} />
      <Skeleton style={{ height: 214 }} />
    </div>
  );
}

export function DashboardProjectList() {
  const projectsQuery = useQuery({
    queryKey: queryKeys.projects,
    queryFn: ({ signal }) => api.getProjects(signal),
  });

  if (projectsQuery.isLoading) {
    return <ProjectListSkeleton />;
  }

  if (projectsQuery.isError) {
    return (
      <Alert title="Projects could not be loaded" tone="danger">
        <p>{getUserFacingApiError(projectsQuery.error)}</p>
        <div className="dashboard-alert-actions">
          <Button variant="secondary" size="sm" onClick={() => void projectsQuery.refetch()} isLoading={projectsQuery.isRefetching}>
            Retry project list
          </Button>
          <Link to="/settings" className="ui-button ui-button-ghost ui-button-sm">
            Check API URL
          </Link>
        </div>
      </Alert>
    );
  }

  const projects = projectsQuery.data?.projects ?? [];

  if (projects.length === 0) {
    return (
      <EmptyState
        eyebrow="No projects yet"
        title="Create the first scene plan"
        description="Dashboard rows are loaded only from GET /api/projects. There are no local mock projects in this view."
        action={
          <Link to="/create" className="ui-button ui-button-primary ui-button-md">
            Create scene plan
          </Link>
        }
      />
    );
  }

  return (
    <div className="ui-page-section">
      <Card>
        <CardContent className="dashboard-summary-row">
          <div>
            <span className="eyebrow">Backend source</span>
            <strong>GET /api/projects</strong>
            <p>{projects.length} project{projects.length === 1 ? "" : "s"} loaded from the Flask API.</p>
          </div>
          <Link to="/create" className="ui-button ui-button-primary ui-button-md">
            Create scene plan
          </Link>
        </CardContent>
      </Card>
      <div className="dashboard-grid">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
