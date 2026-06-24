export const BACKEND_CONTRACT_PHASE = 5 as const;

export const BACKEND_BASE_URL_DEFAULT = "http://localhost:8080" as const;

export const PRIMARY_BACKEND_WORKFLOW = [
  "GET /api/templates",
  "GET /api/models",
  "POST /api/projects",
  "GET /api/projects/:projectId",
  "PUT /api/projects/:projectId/timeline",
  "POST /api/projects/:projectId/timeline/validate",
  "POST /api/projects/:projectId/render",
  "GET /api/jobs/:jobId",
  "GET /api/jobs/:jobId/events?after=:eventId",
  "POST /api/jobs/:jobId/cancel",
  "GET /api/files/:relativePath",
] as const;

export const LEGACY_BACKEND_WORKFLOW = [
  "POST /api/generate",
  "POST /api/cancel",
] as const;

export const BACKEND_CONTRACT_RULES = [
  "Backend source files are not modified by frontend phases.",
  "Frontend code adapts to the Flask API contract.",
  "Project timeline render is the primary workflow.",
  "Legacy generate/cancel endpoints remain separated from the primary workflow.",
  "API calls must go through shared/api endpoint wrappers.",
  "Component-level fetch calls are forbidden.",
  "visual_query remains the canonical backend timeline field.",
  "Result files are accessed through backend /api/files URLs, never local filesystem paths.",
  "Unsupported backend capabilities must not be mocked as live features.",
] as const;
