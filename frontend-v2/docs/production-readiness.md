# Frontend V2 Production Readiness Notes

## Ready

- Buildable Vite React/TypeScript source.
- Central API boundary.
- Backend-bound project creation, timeline editing, validation, rendering, event observation, cancellation, and result preview.
- Tokenized UI styling and shared primitives.
- UX hardening for unsaved changes, offline browser state, render edge cases, and frontend crashes.

## Not ready without backend expansion

- Global render history.
- Account/login flow.
- Billing/subscription.
- Connected social channel management.
- Full auto-posting scheduler.
- Asset selection/picker.
- Cross-project analytics.

## Deployment note

The frontend can be deployed as a static Vite build, but it must point `VITE_API_BASE_URL` to a reachable UnknownScreen Flask API instance. Backend secrets must remain server-side.
