# Timeline Editor Feature

Phase 9 owns timeline edit state, scene cards, hook/summary editing, dirty-state detection, and save-ready normalization.

Boundary:

- Reads project timeline data supplied by `GET /api/projects/:projectId`.
- Saves only through `PUT /api/projects/:projectId/timeline`.
- Preserves backend `visual_query` and unknown fields.
- Does not validate, render, poll jobs, or fabricate asset selections.
