from __future__ import annotations

import json
import re
from typing import Any

from gpt import generate_response
from templates import get_template


def _clean_text(value: Any, fallback: str = "") -> str:
    text = str(value or fallback).strip()
    return re.sub(r"\s+", " ", text)


def _clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default
    return max(minimum, min(maximum, number))


def _extract_json_object(text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text or "")
    if not match:
        raise ValueError("No JSON object found in model response.")

    parsed = json.loads(match.group(0))
    if not isinstance(parsed, dict):
        raise ValueError("Model response JSON is not an object.")
    return parsed


def _fallback_scene_text(subject: str, template_name: str, index: int, scene_count: int) -> tuple[str, str]:
    if index == 1:
        voiceover = f"Most people miss the important part of {subject}."
        caption = f"You are missing this about {subject}"
    elif index == scene_count:
        voiceover = f"Use this as a starting point, then test a stronger version for your own audience."
        caption = "Save this idea"
    else:
        voiceover = f"Point {index - 1}: connect {subject} to one clear viewer problem and keep the explanation short."
        caption = f"Point {index - 1}: keep it specific"
    return voiceover, caption


def build_fallback_timeline(
    *,
    project_id: str | None,
    subject: str,
    template: dict[str, Any],
    language: str,
    platform: str,
    target_duration: int,
    voice_style: str,
    caption_style: str,
    warning: str | None = None,
) -> dict[str, Any]:
    scene_count = _clamp_int(template.get("scene_count"), 6, 4, 10)
    duration = max(3, target_duration // scene_count)
    scenes = []

    for index in range(1, scene_count + 1):
        voiceover, caption = _fallback_scene_text(subject, template["name"], index, scene_count)
        scenes.append(
            {
                "index": index,
                "purpose": "hook" if index == 1 else "cta" if index == scene_count else "value_point",
                "duration": duration,
                "voiceover": voiceover,
                "caption": caption,
                "visual_query": f"{subject} {template.get('visual_style', 'short video b-roll')}",
                "visual_type": "stock_video",
                "transition": "quick_cut",
                "notes": "Fallback scene generated without an LLM JSON response.",
            }
        )

    return {
        "project_id": project_id,
        "topic": subject,
        "template_id": template["id"],
        "template_name": template["name"],
        "language": language,
        "platform": platform,
        "target_duration": target_duration,
        "voice_style": voice_style,
        "caption_style": caption_style or template.get("caption_style"),
        "hook": scenes[0]["voiceover"],
        "summary": f"A {template['name']} plan about {subject}.",
        "scenes": scenes,
        "metadata": {
            "generation_mode": "fallback",
            "warning": warning,
            "source": "local_template_fallback",
        },
    }


def _normalize_timeline(
    raw: dict[str, Any],
    *,
    project_id: str | None,
    subject: str,
    template: dict[str, Any],
    language: str,
    platform: str,
    target_duration: int,
    voice_style: str,
    caption_style: str,
) -> dict[str, Any]:
    scenes_in = raw.get("scenes") if isinstance(raw.get("scenes"), list) else []
    normalized_scenes: list[dict[str, Any]] = []
    default_scene_count = _clamp_int(template.get("scene_count"), 6, 3, 12)
    default_duration = max(3, target_duration // max(1, default_scene_count))

    for i, scene in enumerate(scenes_in[:12], start=1):
        if not isinstance(scene, dict):
            continue
        voiceover = _clean_text(scene.get("voiceover") or scene.get("script"), f"Scene {i} about {subject}.")
        caption = _clean_text(scene.get("caption"), voiceover[:80])
        visual_query = _clean_text(scene.get("visual_query") or scene.get("visualQuery"), subject)
        normalized_scenes.append(
            {
                "index": i,
                "purpose": _clean_text(scene.get("purpose"), "value_point"),
                "duration": _clamp_int(scene.get("duration"), default_duration, 2, 12),
                "voiceover": voiceover,
                "caption": caption,
                "visual_query": visual_query,
                "visual_type": _clean_text(scene.get("visual_type"), "stock_video"),
                "transition": _clean_text(scene.get("transition"), "quick_cut"),
                "notes": _clean_text(scene.get("notes"), ""),
            }
        )

    if len(normalized_scenes) < 3:
        return build_fallback_timeline(
            project_id=project_id,
            subject=subject,
            template=template,
            language=language,
            platform=platform,
            target_duration=target_duration,
            voice_style=voice_style,
            caption_style=caption_style,
            warning="LLM response did not contain enough valid scenes.",
        )

    return {
        "project_id": project_id,
        "topic": subject,
        "template_id": template["id"],
        "template_name": template["name"],
        "language": language,
        "platform": platform,
        "target_duration": target_duration,
        "voice_style": voice_style,
        "caption_style": caption_style or template.get("caption_style"),
        "hook": _clean_text(raw.get("hook"), normalized_scenes[0]["voiceover"]),
        "summary": _clean_text(raw.get("summary"), f"A {template['name']} plan about {subject}."),
        "scenes": normalized_scenes,
        "metadata": {
            "generation_mode": "llm",
            "source": "ollama_scene_planner",
            "template": template,
        },
    }


def _planner_prompt(
    *,
    subject: str,
    template: dict[str, Any],
    language: str,
    platform: str,
    target_duration: int,
    voice_style: str,
    caption_style: str,
) -> str:
    scene_count = _clamp_int(template.get("scene_count"), 6, 4, 10)
    return f"""
You are designing a short-form video production plan, not rendering a video.
Return only one valid JSON object. Do not include markdown, comments, or explanations.

Topic: {subject}
Language: {language}
Platform: {platform}
Target duration seconds: {target_duration}
Template: {template['name']}
Template description: {template['description']}
Recommended scene count: {scene_count}
Hook style: {template['hook_style']}
Tone: {template['tone']}
Caption style: {caption_style or template['caption_style']}
Voice style: {voice_style or 'neutral'}
Visual style: {template['visual_style']}
CTA style: {template['cta']}

Create a scene plan that a frontend workspace can edit before render.
Each scene must be short, concrete, and useful for YouTube Shorts, TikTok, and Reels.
Each caption must be punchy and shorter than the voiceover.
Each visual_query must be suitable for stock video or future AI media generation.

JSON schema:
{{
  "hook": "string",
  "summary": "string",
  "scenes": [
    {{
      "purpose": "hook | value_point | proof | reveal | cta",
      "duration": 3,
      "voiceover": "string",
      "caption": "string",
      "visual_query": "string",
      "visual_type": "stock_video",
      "transition": "quick_cut",
      "notes": "string"
    }}
  ]
}}
""".strip()


def build_timeline(
    *,
    project_id: str | None,
    subject: str,
    template_id: str | None,
    language: str,
    platform: str,
    target_duration: int,
    ai_model: str | None,
    voice_style: str,
    caption_style: str,
) -> dict[str, Any]:
    subject = _clean_text(subject)
    language = _clean_text(language, "English")
    platform = _clean_text(platform, "youtube_shorts")
    voice_style = _clean_text(voice_style, "neutral")
    caption_style = _clean_text(caption_style, "bold_viral")
    target_duration = _clamp_int(target_duration, 40, 15, 90)
    template = get_template(template_id)

    prompt = _planner_prompt(
        subject=subject,
        template=template,
        language=language,
        platform=platform,
        target_duration=target_duration,
        voice_style=voice_style,
        caption_style=caption_style,
    )

    try:
        response = generate_response(prompt, ai_model or "")
        parsed = _extract_json_object(response)
        return _normalize_timeline(
            parsed,
            project_id=project_id,
            subject=subject,
            template=template,
            language=language,
            platform=platform,
            target_duration=target_duration,
            voice_style=voice_style,
            caption_style=caption_style,
        )
    except Exception as err:
        return build_fallback_timeline(
            project_id=project_id,
            subject=subject,
            template=template,
            language=language,
            platform=platform,
            target_duration=target_duration,
            voice_style=voice_style,
            caption_style=caption_style,
            warning=str(err),
        )
