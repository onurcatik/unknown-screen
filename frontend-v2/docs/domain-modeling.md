# Frontend V2 Domain Modeling Notes

Phase 3 defines the frontend domain model layer. These notes are implementation guardrails for later phases.

## Stable decisions

- Project response fields use camelCase because Backend/main.py emits camelCase.
- Template response fields use snake_case because Backend/templates.py emits snake_case.
- Timeline JSON uses snake_case because Backend/planner.py and Backend/timeline_adapter.py use snake_case.
- visual_query is canonical for backend payloads.
- visualQuery is only a compatibility read input.
- Render job state is not the same as project status.
- resultPath is not a local filesystem path.
- resultUrl is the only safe value for browser preview/open actions.

## Domain import rule

Entity model files must stay framework-agnostic. They may be imported by future API client, hooks, pages, and components, but they must not import React or UI modules.

## Serialization rule

Before PUT timeline, POST validate, or POST render preflight, call the future serialization helper around the Timeline object so scene visualQuery fields are converted to visual_query and scene indices are normalized.

## Unsupported in domain phase

Do not add domain types for user accounts, billing, teams, social channel manager, global analytics, asset library, auto-posting scheduler, or reference image generation. Those are product ideas, not current backend capabilities.
