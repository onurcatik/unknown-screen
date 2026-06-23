from __future__ import annotations

from copy import deepcopy
from typing import Any


TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "top_5_listicle",
        "name": "Top 5 Listicle",
        "description": "Fast list-based short with a strong hook, numbered scenes, and a concise CTA.",
        "recommended_duration": 40,
        "scene_count": 7,
        "hook_style": "contrarian or curiosity gap",
        "tone": "direct, fast, practical",
        "caption_style": "bold_viral",
        "visual_style": "fast stock B-roll with clear topic matches",
        "cta": "follow for part 2",
    },
    {
        "id": "reddit_story",
        "name": "Reddit Story",
        "description": "Narrative short built around conflict, tension, reveal, and a comment-driving ending.",
        "recommended_duration": 55,
        "scene_count": 8,
        "hook_style": "dramatic first-person setup",
        "tone": "storytelling, suspenseful, conversational",
        "caption_style": "reddit_story",
        "visual_style": "gameplay or satisfying background plus subtitles",
        "cta": "what would you do?",
    },
    {
        "id": "ai_news",
        "name": "AI News",
        "description": "Short news explainer that summarizes a development, why it matters, and what changes next.",
        "recommended_duration": 35,
        "scene_count": 6,
        "hook_style": "breaking-change claim",
        "tone": "clear, urgent, analytical",
        "caption_style": "clean_minimal",
        "visual_style": "tech dashboards, devices, labs, product screenshots when permitted",
        "cta": "save this update",
    },
    {
        "id": "motivational_short",
        "name": "Motivational Short",
        "description": "High-retention emotional short with punchy lines and escalating intensity.",
        "recommended_duration": 30,
        "scene_count": 5,
        "hook_style": "identity challenge",
        "tone": "intense, concise, emotional",
        "caption_style": "karaoke",
        "visual_style": "cinematic lifestyle, training, work, discipline B-roll",
        "cta": "send this to someone who needs it",
    },
    {
        "id": "product_promo",
        "name": "Product Promo",
        "description": "Problem-solution product short with benefit scenes and a clear conversion CTA.",
        "recommended_duration": 35,
        "scene_count": 6,
        "hook_style": "pain point opener",
        "tone": "benefit-driven, simple, persuasive",
        "caption_style": "bold_viral",
        "visual_style": "product demo, user scenario, before-after visuals",
        "cta": "try it today",
    },
    {
        "id": "quiz",
        "name": "Quiz",
        "description": "Interactive short that asks a question, creates a pause, then reveals the answer.",
        "recommended_duration": 25,
        "scene_count": 5,
        "hook_style": "test yourself question",
        "tone": "interactive, playful, educational",
        "caption_style": "bold_viral",
        "visual_style": "simple visual clue progression",
        "cta": "comment your score",
    },
    {
        "id": "myth_vs_fact",
        "name": "Myth vs Fact",
        "description": "Educational correction format that debunks a common belief with sharp evidence.",
        "recommended_duration": 35,
        "scene_count": 6,
        "hook_style": "common belief challenge",
        "tone": "authoritative, crisp, corrective",
        "caption_style": "clean_minimal",
        "visual_style": "contrast visuals and explanatory B-roll",
        "cta": "save before you forget",
    },
    {
        "id": "educational_micro_lesson",
        "name": "Educational Micro Lesson",
        "description": "Tiny lesson that teaches one useful concept with one example and one takeaway.",
        "recommended_duration": 40,
        "scene_count": 6,
        "hook_style": "one concept promise",
        "tone": "teacher-like, practical, concise",
        "caption_style": "corporate_clean",
        "visual_style": "explainers, diagrams, relevant work scenes",
        "cta": "follow for one lesson a day",
    },
    {
        "id": "history_facts",
        "name": "History Facts",
        "description": "Narrative fact short with one surprising historical detail and a strong reveal.",
        "recommended_duration": 40,
        "scene_count": 6,
        "hook_style": "surprising historical claim",
        "tone": "mysterious, documentary, clear",
        "caption_style": "clean_minimal",
        "visual_style": "archive-like, monuments, maps, dramatic B-roll",
        "cta": "follow for hidden history",
    },
    {
        "id": "before_after",
        "name": "Before / After",
        "description": "Transformation short that shows the old way, the change, and the final result.",
        "recommended_duration": 35,
        "scene_count": 6,
        "hook_style": "transformation preview",
        "tone": "visual, practical, proof-oriented",
        "caption_style": "bold_viral",
        "visual_style": "split contrast, progress, result reveal",
        "cta": "save this workflow",
    },
]


def list_templates() -> list[dict[str, Any]]:
    return deepcopy(TEMPLATES)


def get_template(template_id: str | None) -> dict[str, Any]:
    if template_id:
        for template in TEMPLATES:
            if template["id"] == template_id:
                return deepcopy(template)
    return deepcopy(TEMPLATES[0])


def template_ids() -> set[str]:
    return {template["id"] for template in TEMPLATES}
