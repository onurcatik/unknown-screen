# UnknownScreen Frontend V2 Design System

Phase 6 establishes the visual and component foundation only. It does not wire feature data, submit forms, create fake project records, or simulate backend render state.

## Design principles

1. The interface must feel like a professional AI Shorts production studio, not a toy prompt form.
2. Styling must be token-driven so future feature screens inherit the same spacing, border, radius, surface, and status language.
3. UI primitives must be small, typed, reusable, and independent from backend domain logic.
4. Backend state must not be invented to make UI demos look full.
5. Components may reserve layout with skeletons, but they must not pretend to contain real projects, jobs, timelines, assets, billing, auth, or analytics.

## Token groups

- `--color-*`: surface, border, text, accent, success, warning, danger, and soft status backgrounds.
- `--space-*`: spacing scale used by page, card, form, and shell layouts.
- `--radius-*`: shared border radius scale for cards, inputs, badges, buttons, and panels.
- `--shadow-*`: panel and focus-ring shadows.
- `--font-*`: sans and mono font stacks.

## Shared UI primitives

- `Button`: primary, secondary, ghost, and danger actions.
- `Card`: structured surface with header, content, footer, title, and description.
- `Badge`: compact status and metadata markers.
- `Alert`: inline information, success, warning, and danger messages.
- `Input`, `Textarea`, `Select`, `Field`, `Label`: accessible form primitives.
- `Skeleton`: loading placeholder without fake data.
- `EmptyState`: reusable empty-state surface.
- `ToastProvider` and `useToast`: small notification system for later feature phases.
- `PageSection`: consistent page grouping primitive.

## Rules

- Do not place random one-off CSS inside feature files when a shared primitive exists.
- Do not create backend-specific UI primitives in `shared/ui`.
- Do not add styling libraries unless they solve a real problem and the phase explicitly allows them.
- Do not show status colors without mapping them to real backend state in later feature phases.
- Do not use fake percentage progress when backend does not provide percentage progress.
