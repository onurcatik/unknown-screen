import pytest

from timeline_adapter import TimelineValidationError, validate_and_adapt_timeline


BASE_KWARGS = {
    "project_id": "project-1",
    "subject": "AI ecommerce tools",
    "template_id": "top_5_listicle",
    "language": "English",
    "platform": "youtube_shorts",
    "target_duration": 40,
    "voice_style": "neutral",
    "caption_style": "bold_viral",
}


def test_validate_rejects_empty_timeline():
    with pytest.raises(TimelineValidationError):
        validate_and_adapt_timeline({"scenes": []}, **BASE_KWARGS)


def test_validate_normalizes_scene_fallbacks():
    timeline = {
        "topic": "AI ecommerce tools",
        "scenes": [
            {"caption": "Use AI to find product gaps", "duration": 0, "visual_query": "seller dashboard analytics"},
            {"voiceover": "Track margins before scaling.", "duration": "3"},
            {"voiceover": "Automate repetitive listing work.", "caption": "Automate listings", "duration": 18},
        ],
    }

    adapted = validate_and_adapt_timeline(timeline, **BASE_KWARGS)

    assert len(adapted.scenes) == 3
    assert adapted.scenes[0].voiceover == "Use AI to find product gaps"
    assert adapted.scenes[0].duration == 2.0
    assert adapted.scenes[1].visual_query
    assert adapted.scenes[2].duration == 14.0
    assert adapted.all_warnings


def test_render_summary_includes_scene_quality_warnings():
    timeline = {
        "topic": "AI",
        "scenes": [
            {
                "voiceover": "This is a very dense scene with many words that will probably be too long for the duration.",
                "caption": "This caption is intentionally very long and should trigger a readability warning because it is too much text for a short video scene.",
                "visual_query": "video",
                "duration": 2,
            },
            {"voiceover": "Second scene", "caption": "Second", "visual_query": "AI software dashboard", "duration": 3},
            {"voiceover": "Third scene", "caption": "Third", "visual_query": "online business analytics", "duration": 3},
        ],
    }

    adapted = validate_and_adapt_timeline(timeline, **BASE_KWARGS)
    summary = adapted.render_summary()

    assert summary["sceneCount"] == 3
    assert summary["warnings"]
    assert any("Caption is long" in item for item in summary["warnings"])
    assert any("Visual query is generic" in item for item in summary["warnings"])
