import { env } from "@shared/config";
import { Alert, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, PageHeader, PhaseNotice } from "@shared/ui";

export function SettingsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Phase 6 style system"
        title="Settings"
        description="This page may show frontend runtime configuration and local UI preferences, but it must not edit backend environment files."
      />
      <Alert title="Runtime configuration" tone="info">
        API base URL is read from frontend environment configuration only. Backend .env files are not edited from the UI.
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>API connection boundary</CardTitle>
          <CardDescription>Visible setting only; not a backend mutation surface.</CardDescription>
        </CardHeader>
        <CardContent className="ui-page-section">
          <Field label="API base URL">
            <Input value={env.apiBaseUrl} readOnly />
          </Field>
          <Badge tone="accent">Frontend setting</Badge>
        </CardContent>
      </Card>
      <PhaseNotice title="No backend config editor" body={env.apiBaseUrl} />
    </div>
  );
}
