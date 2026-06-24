import { Link } from "react-router-dom";
import { DashboardProjectList } from "@widgets/dashboard";
import { PageHeader } from "@shared/ui";

export function DashboardPage() {
  return (
    <div className="page-stack dashboard-page">
      <PageHeader
        eyebrow="Phase 7 dashboard"
        title="Production dashboard"
        description="Real projects are loaded from the existing Flask backend. This view does not create mock projects, fake render history, or unsupported analytics."
      />
      <div className="dashboard-toolbar" aria-label="Dashboard actions">
        <Link to="/create" className="ui-button ui-button-primary ui-button-md">
          Create scene plan
        </Link>
        <Link to="/renders" className="ui-button ui-button-secondary ui-button-md">
          Open render observer
        </Link>
      </div>
      <DashboardProjectList />
    </div>
  );
}
