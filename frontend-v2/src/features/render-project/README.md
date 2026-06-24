# Render Project Feature

Owns the frontend-only orchestration for validation, render queueing, job polling, event polling, cancel, and result preview.

Backend remains the source of truth. This feature does not render video in the browser, does not fabricate job history, and does not create fake progress percentages.
