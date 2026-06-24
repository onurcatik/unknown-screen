# UnknownScreen Frontend V2

React + TypeScript + Vite frontend for the existing UnknownScreen Flask backend.

This frontend is intentionally backend-bound. It consumes the current API contract and does not require backend Python changes.

## Phase status

Phase 12 / 12 complete: Final Audit and Productization Control.

## Implemented workflow

- Dashboard reads real projects from `GET /api/projects`.
- Create Flow reads templates and models from `GET /api/templates` and `GET /api/models`.
- Project creation uses `POST /api/projects`.
- Studio reads project detail from `GET /api/projects/:projectId`.
- Timeline editing saves with `PUT /api/projects/:projectId/timeline`.
- Validation uses `POST /api/projects/:projectId/timeline/validate`.
- Rendering uses `POST /api/projects/:projectId/render`.
- Render Observatory uses `GET /api/jobs/:jobId`, `GET /api/jobs/:jobId/events?after=:eventId`, and `POST /api/jobs/:jobId/cancel`.
- Result preview opens completed output through the backend file-access contract.

## Routes

```txt
/dashboard
/create
/studio/:projectId
/renders
/settings
```

## Architecture

```txt
src/
  app/                application shell, providers, router
  pages/              route-level pages
  widgets/            page-scale composition blocks
  features/           create, templates, timeline editor, render project
  entities/           project, template, timeline, job, model domain types/UI
  shared/             API client, config, hooks, lib, UI primitives, styles
```

## Development

Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Run the frontend:

```bash
npm install
npm run dev
```

Default backend URL:

```txt
VITE_API_BASE_URL=http://localhost:8080
```

Run checks:

```bash
npm run typecheck
npm run build
```

## Backend requirements

Run the existing backend API separately:

```bash
uv run python Backend/main.py
```

Run the existing worker separately when rendering videos:

```bash
uv run python Backend/worker.py
```

## Guardrails

- Do not edit backend Python files from this frontend phase.
- Do not add fake endpoints or mock business state to make pages look complete.
- Do not put secrets in frontend environment variables.
- Do not call legacy `/api/generate` as the main product flow.
- Main product flow remains: project creation -> timeline editing -> validation -> render queue -> job/events observation.
- Do not implement auth, billing, channel management, auto-posting scheduler, global analytics, or asset picker unless the backend contract is explicitly expanded in a backend phase.

## Known limitations

- `/renders` cannot show a real global render history because the backend has no global list-jobs endpoint.
- Browser online/offline status is not a backend health check.
- Render progress is stage/log based; no fake percentage is shown.
- npm audit advisories should be reviewed separately before production deployment.
