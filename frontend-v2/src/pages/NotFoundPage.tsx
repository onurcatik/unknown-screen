import { Link } from "react-router-dom";
import { Button, Card, CardContent, PageHeader } from "@shared/ui";

export function NotFoundPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="404"
        title="Page not found"
        description="The requested frontend route does not exist in the current frontend shell."
      />
      <Card>
        <CardContent>
          <Link to="/dashboard">
            <Button variant="primary">Return to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
