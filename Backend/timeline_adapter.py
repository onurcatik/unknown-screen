from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


class TimelineValidationError(ValueError):
    """Raised when a timeline cannot safely be rendered."""


@dataclass
class RenderScene:
    index: int
    purpose: str
    duration: float
    voiceover: str
    caption: str
    visual_query: str
    visual_type: str = "stock_video"
    transition: str = "quick_cut"
    warnings: list[str] = field(default_factory=list)


@dataclass
class RenderTimeline:
    project_id: str
    topic: str
    template_id: str
    template_name: str
    language: str
    platform: str
    target_duration: int
    voice_style: str
    caption_style: str
    hook: str
    summary: str
    scenes: list[RenderScene]
    warnings: list[str] = field(default_factory=list)
    quality_warnings: list[str] = field(default_factory=list)

    @property
    def total_duration(self) -> float:
        return round(sum(scene.duration for scene in self.scenes), 2)

    @property
    def all_warnings(self) -> list[str]:
        scene_warnings: list[str] = []
        for scene in self.scenes:
            for warning in scene.warnings:
                scene_warnings.append(f"Scene {scene.index}: {warning}")
        return [*self.warnings, *self.quality_warnings, *scene_warnings]

    def render_summary(self) -> dict[str, Any]:
        return {
            "sceneCount": len(self.scenes),
            "totalDuration": self.total_duration,
            "warnings": self.all_warnings,
            "qualityWarnings": self.quality_warnings,
            "platform": self.platform,
            "templateId": self.template_id,
            "captionStyle": self.caption_style,
        }

    def to_dict(self) -> dict[str, Any]:
        return {
            "project_id": self.project_id,
            "topic": self.topic,
            "template_id": self.template_id,
            "template_name": self.template_name,
            "language": self.language,
            "platform": self.platform,
            "target_duration": self.target_duration,
            "voice_style": self.voice_style,
            "caption_style": self.caption_style,
            "hook": self.hook,
            "summary": self.summary,
            "total_duration": self.total_duration,
            "warnings": self.warnings,
            "quality_warnings": self.quality_warnings,
            "all_warnings": self.all_warnings,
            "scenes": [
                {
                    "index": scene.index,
                    "purpose": scene.purpose,
                    "duration": scene.duration,
                    "voiceover": scene.voiceover,
                    "caption": scene.caption,
                    "visual_query": scene.visual_query,
                    "visual_type": scene.visual_type,
                    "transition": scene.transition,
                    "warnings": scene.warnings,
                }
                for scene in self.scenes
            ],
        }


def _clean_text(value: Any, fallback: str = "") -> str:
    text = str(value or fallback).strip()
    return re.sub(r"\s+", " ", text)


def _safe_float(value: Any, default: float, minimum: float, maximum: float) -> tuple[float, str | None]:
    warning = None
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = default
        warning = f"Duration was missing or invalid; defaulted to {default:g}s."

    if number < minimum:
        warning = f"Duration {number:g}s was too short; raised to {minimum:g}s."
        number = minimum
    elif number > maximum:
        warning = f"Duration {number:g}s was too long; capped at {maximum:g}s."
        number = maximum
    return round(number, 2), warning


def _short_caption(text: str, max_chars: int = 84) -> str:
    text = _clean_text(text)
    if len(text) <= max_chars:
        return text
    trimmed = text[:max_chars].rsplit(" ", 1)[0].strip()
    return trimmed or text[:max_chars].strip()


def _word_count(text: str) -> int:
    return len([part for part in _clean_text(text).split(" ") if part])


def _platform_duration_limit(platform: str) -> int:
    normalized = _clean_text(platform).lower()
    if normalized in {"youtube_shorts", "youtube", "shorts"}:
        return 60
    if normalized in {"instagram_reels", "reels", "instagram"}:
        return 90
    if normalized in {"tiktok", "tik_tok"}:
        return 180
    return 90


def _looks_too_generic(query: str, topic: str) -> bool:
    query_words = set(_clean_text(query).lower().split())
    generic = {"video", "b-roll", "stock", "short", "content", "scene", "background"}
    if len(query_words - generic) < 2:
        return True
    topic_words = set(_clean_text(topic).lower().split())
    return bool(topic_words) and query_words.issubset(topic_words | generic)


def validate_and_adapt_timeline(
    timeline: dict[str, Any] | None,
    *,
    project_id: str,
    subject: str,
    template_id: str,
    language: str,
    platform: str,
    target_duration: int,
    voice_style: str | None = None,
    caption_style: str | None = None,
) -> RenderTimeline:
    """Normalize editable Timeline JSON into strict render input.

    The adapter is the only boundary between flexible UI data and the render
    pipeline. Critical problems raise TimelineValidationError; quality issues
    become warnings so the user can still render when the timeline is usable.
    """

    if not isinstance(timeline, dict):
        raise TimelineValidationError("Timeline JSON is missing. Create and save a scene plan before rendering.")

    raw_scenes = timeline.get("scenes")
    if not isinstance(raw_scenes, list) or not raw_scenes:
        raise TimelineValidationError("Timeline has no scenes. Add at least one scene before rendering.")

    topic = _clean_text(timeline.get("topic"), subject)
    template_name = _clean_text(timeline.get("template_name"), template_id)
    resolved_language = _clean_text(timeline.get("language"), language)
    resolved_platform = _clean_text(timeline.get("platform"), platform)
    resolved_voice_style = _clean_text(timeline.get("voice_style"), voice_style or "neutral")
    resolved_caption_style = _clean_text(timeline.get("caption_style"), caption_style or "bold_viral")
    hook = _clean_text(timeline.get("hook"), "")
    summary = _clean_text(timeline.get("summary"), f"A short video about {topic}.")

    warnings: list[str] = []
    quality_warnings: list[str] = []
    scenes: list[RenderScene] = []
    default_duration = max(3.0, min(8.0, float(target_duration or 40) / max(1, len(raw_scenes))))

    for raw_index, raw_scene in enumerate(raw_scenes, start=1):
        if not isinstance(raw_scene, dict):
            warnings.append(f"Scene {raw_index} was ignored because it was not an object.")
            continue

        scene_warnings: list[str] = []
        voiceover = _clean_text(raw_scene.get("voiceover") or raw_scene.get("script"))
        caption = _clean_text(raw_scene.get("caption"))
        visual_query = _clean_text(raw_scene.get("visual_query") or raw_scene.get("visualQuery"))

        if not voiceover and caption:
            voiceover = caption
            scene_warnings.append("Voiceover was missing; caption was used as fallback.")
        if not caption and voiceover:
            caption = _short_caption(voiceover)
            scene_warnings.append("Caption was missing; a short caption was created from voiceover.")
        if not voiceover:
            voiceover = f"Here is one important point about {topic}."
            scene_warnings.append("Voiceover was missing; a fallback line was created.")
        if not caption:
            caption = _short_caption(voiceover)
            scene_warnings.append("Caption was missing; a fallback caption was created.")
        if not visual_query:
            visual_query = f"{topic} {template_name} short video b-roll"
            scene_warnings.append("Visual query was missing; topic and template fallback was used.")

        duration, duration_warning = _safe_float(raw_scene.get("duration"), default_duration, 2.0, 14.0)
        if duration_warning:
            scene_warnings.append(duration_warning)

        if len(caption) > 92:
            scene_warnings.append("Caption is long for a short-form scene; consider shortening it before final render.")
        if _word_count(voiceover) > max(12, int(duration * 3.1)):
            scene_warnings.append("Voiceover looks dense for the planned duration; render may extend this scene to fit the audio.")
        if _looks_too_generic(visual_query, topic):
            scene_warnings.append("Visual query is generic; a more concrete visual idea will improve asset matching.")

        scenes.append(
            RenderScene(
                index=len(scenes) + 1,
                purpose=_clean_text(raw_scene.get("purpose"), "value_point"),
                duration=duration,
                voiceover=voiceover,
                caption=caption,
                visual_query=visual_query,
                visual_type=_clean_text(raw_scene.get("visual_type"), "stock_video"),
                transition=_clean_text(raw_scene.get("transition"), "quick_cut"),
                warnings=scene_warnings,
            )
        )

    if not scenes:
        raise TimelineValidationError("Timeline has no valid scenes. Add at least one usable scene before rendering.")

    if len(scenes) < 3:
        quality_warnings.append("Timeline has fewer than 3 scenes; the video may feel too thin for Shorts/Reels.")

    total_duration = sum(scene.duration for scene in scenes)
    platform_limit = _platform_duration_limit(resolved_platform)
    if total_duration < 8:
        quality_warnings.append("Timeline duration is under 8 seconds; consider adding scenes or increasing durations.")
    if total_duration > platform_limit:
        quality_warnings.append(
            f"Timeline duration is {total_duration:.1f}s and may exceed the expected {platform_limit}s limit for {resolved_platform}."
        )
    if total_duration > max(90, platform_limit):
        quality_warnings.append("Timeline is long for short-form pacing; consider reducing scene count or duration.")

    return RenderTimeline(
        project_id=project_id,
        topic=topic,
        template_id=_clean_text(timeline.get("template_id"), template_id),
        template_name=template_name,
        language=resolved_language,
        platform=resolved_platform,
        target_duration=int(target_duration or 40),
        voice_style=resolved_voice_style,
        caption_style=resolved_caption_style,
        hook=hook or scenes[0].voiceover,
        summary=summary,
        scenes=scenes,
        warnings=warnings,
        quality_warnings=quality_warnings,
    )
