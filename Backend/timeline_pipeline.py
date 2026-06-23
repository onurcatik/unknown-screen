from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from moviepy import (
    AudioFileClip,
    ColorClip,
    CompositeAudioClip,
    CompositeVideoClip,
    TextClip,
    VideoFileClip,
    afx,
    vfx,
    concatenate_videoclips,
)
from moviepy.video.tools.subtitles import SubtitlesClip

from logstream import log
from search import search_for_stock_videos
from tiktokvoice import tts
from timeline_adapter import RenderScene, validate_and_adapt_timeline
from utils import FONTS_DIR, PROJECT_ROOT, RUNS_DIR, choose_random_song
from video import save_video

FRAME_EPSILON = 1 / 120
DEFAULT_RESOLUTION = (1080, 1920)


class TimelineRenderError(RuntimeError):
    pass


class TimelineRenderStageError(TimelineRenderError):
    def __init__(self, stage: str, message: str):
        self.stage = stage
        super().__init__(f"{stage}: {message}")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _relative_to_project(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(PROJECT_ROOT.resolve()))
    except ValueError:
        return str(path.resolve())


def _emit(on_log, message: str, level: str = "info") -> None:
    log(message, level)
    if on_log:
        on_log(message, level)


def _add_report_event(report: dict, stage: str, level: str, message: str, payload: dict | None = None) -> None:
    report.setdefault("events", []).append(
        {
            "timestamp": _now_iso(),
            "stage": stage,
            "level": level,
            "message": message,
            "payload": payload or {},
        }
    )


def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _srt_time(seconds: float) -> str:
    milliseconds_total = int(round(seconds * 1000))
    hours, remainder = divmod(milliseconds_total, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds_part, milliseconds = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds_part:02d},{milliseconds:03d}"


def _write_scene_srt(scenes: list[dict], subtitles_path: Path) -> None:
    lines = []
    for index, scene in enumerate(scenes, start=1):
        start = float(scene["start"])
        end = float(scene["end"])
        caption = str(scene["caption"]).strip() or str(scene["voiceover"]).strip()
        if end <= start:
            end = start + 2.0
        lines.append(f"{index}\n{_srt_time(start)} --> {_srt_time(end)}\n{caption}\n")
    subtitles_path.write_text("\n".join(lines), encoding="utf-8")


def _crop_to_vertical(clip: VideoFileClip):
    clip = clip.without_audio()
    if round((clip.w / clip.h), 4) < 0.5625:
        clip = clip.cropped(
            width=clip.w,
            height=round(clip.w / 0.5625),
            x_center=clip.w / 2,
            y_center=clip.h / 2,
        )
    else:
        clip = clip.cropped(
            width=round(0.5625 * clip.h),
            height=clip.h,
            x_center=clip.w / 2,
            y_center=clip.h / 2,
        )
    return clip.resized(new_size=DEFAULT_RESOLUTION).with_fps(30)


def _fallback_scene_clip(duration: float):
    return ColorClip(size=DEFAULT_RESOLUTION, color=(20, 24, 28), duration=duration).with_fps(30)


def _make_scene_clip(asset_path: str | None, duration: float):
    if asset_path:
        clip = VideoFileClip(asset_path)
        try:
            clip = _crop_to_vertical(clip)
            source_duration = max(0.0, float(clip.duration or 0.0) - FRAME_EPSILON)
            if source_duration <= 0:
                raise TimelineRenderError("Selected asset has no usable duration.")
            if source_duration >= duration:
                clip = clip.subclipped(0, duration)
            else:
                clip = clip.with_effects([vfx.Loop(duration=duration)])
            return clip.with_duration(duration)
        except Exception:
            try:
                clip.close()
            except Exception:
                pass
            raise

    return _fallback_scene_clip(duration)


def _render_subtitled_video(
    *,
    base_video_path: Path,
    audio,
    subtitles_path: Path,
    output_path: Path,
    subtitles_position: str,
    text_color: str,
    threads: int,
) -> None:
    font_file = (FONTS_DIR / "bold_font.ttf").resolve()
    font_path = str(font_file) if font_file.exists() else None
    generator = lambda txt: TextClip(
        font=font_path,
        text=txt,
        font_size=90,
        color=text_color or "#FFFF00",
        stroke_color="black",
        stroke_width=5,
    )

    try:
        horizontal, vertical = (subtitles_position or "center,bottom").split(",")
    except ValueError:
        horizontal, vertical = "center", "bottom"

    subtitle_vertical_position = 80 if vertical == "top" else vertical

    base_video = VideoFileClip(str(base_video_path))
    subtitles = SubtitlesClip(str(subtitles_path), make_textclip=generator)
    target_duration = min(float(base_video.duration), float(audio.duration))
    result = CompositeVideoClip(
        [
            base_video.subclipped(0, target_duration),
            subtitles.with_position((horizontal, subtitle_vertical_position)).with_duration(target_duration),
        ]
    )
    result = result.with_audio(audio.with_duration(target_duration)).with_duration(target_duration)

    try:
        result.write_videofile(
            str(output_path),
            threads=threads or 2,
            fps=30,
            codec="libx264",
            audio_codec="aac",
            preset="medium",
        )
    finally:
        result.close()
        subtitles.close()
        base_video.close()


def _download_asset_for_scene(scene: RenderScene, assets_dir: Path, used_urls: set[str], emit, guard_cancelled) -> tuple[str | None, dict]:
    api_key = os.getenv("PEXELS_API_KEY", "")
    metadata = {
        "scene_index": scene.index,
        "query": scene.visual_query,
        "source": "fallback_color",
        "url": None,
        "path": None,
        "fallback_reason": None,
    }
    if not api_key:
        metadata["fallback_reason"] = "PEXELS_API_KEY missing"
        emit(f"[!] PEXELS_API_KEY missing. Scene {scene.index} will use a fallback background.", "warning")
        return None, metadata

    guard_cancelled()
    try:
        urls = search_for_stock_videos(scene.visual_query, api_key, 8, max(2, int(scene.duration)))
    except Exception as err:
        metadata["fallback_reason"] = f"Asset search failed: {err}"
        emit(f"[!] Asset search failed for scene {scene.index}: {err}", "warning")
        urls = []
    chosen_url = next((url for url in urls if url not in used_urls), None) or (urls[0] if urls else None)
    if not chosen_url:
        metadata["fallback_reason"] = metadata["fallback_reason"] or "No matching stock asset found"
        emit(f"[!] No stock asset found for scene {scene.index}: {scene.visual_query}", "warning")
        return None, metadata

    used_urls.add(chosen_url)
    guard_cancelled()
    try:
        saved_path = save_video(chosen_url, directory=str(assets_dir))
        metadata.update({"source": "pexels", "url": chosen_url, "path": _relative_to_project(Path(saved_path))})
        return saved_path, metadata
    except Exception as err:
        metadata["fallback_reason"] = f"Asset download failed: {err}"
        emit(f"[!] Could not download asset for scene {scene.index}: {err}", "warning")
        return None, metadata


def _generate_scene_tts(scene: RenderScene, voice: str, audio_path: Path) -> None:
    try:
        tts(scene.voiceover, voice, filename=str(audio_path))
    except Exception as err:
        raise TimelineRenderStageError("TTS", f"Scene {scene.index} voice generation failed: {err}") from err
    if not audio_path.exists() or audio_path.stat().st_size == 0:
        raise TimelineRenderStageError("TTS", f"Scene {scene.index} voice generation produced no usable audio file.")


def run_timeline_render_pipeline(
    *,
    project,
    render_options: dict,
    job_id: str,
    is_cancelled,
    on_log,
) -> str:
    report: dict = {
        "project_id": getattr(project, "id", None),
        "job_id": job_id,
        "status": "running",
        "started_at": _now_iso(),
        "events": [],
        "warnings": [],
        "asset_metadata": [],
        "scenes": [],
    }

    def emit(message: str, level: str = "info", stage: str = "general", payload: dict | None = None) -> None:
        _emit(on_log, message, level)
        _add_report_event(report, stage, level, message, payload)
        if level == "warning":
            report.setdefault("warnings", []).append(message)

    def guard_cancelled() -> None:
        if is_cancelled and is_cancelled():
            from pipeline import PipelineCancelled

            raise PipelineCancelled("Timeline render was cancelled.")

    run_dir = RUNS_DIR / str(project.id) / job_id
    assets_dir = run_dir / "assets"
    audio_dir = run_dir / "audio"
    subtitles_dir = run_dir / "subtitles"
    renders_dir = run_dir / "renders"
    final_dir = run_dir / "final"
    for directory in [assets_dir, audio_dir, subtitles_dir, renders_dir, final_dir]:
        directory.mkdir(parents=True, exist_ok=True)
    report_path = run_dir / "render_report.json"

    video_clips = []
    audio_clips = []
    source_audio_clips = []
    song_clip = None
    timeline_audio = None

    try:
        emit("[Timeline Render] Validating saved timeline before render.", "info", "validation")
        render_timeline = validate_and_adapt_timeline(
            project.timeline_json,
            project_id=project.id,
            subject=project.subject,
            template_id=project.template_id,
            language=project.language,
            platform=project.platform,
            target_duration=project.target_duration,
            voice_style=project.voice_style,
            caption_style=project.caption_style,
        )

        snapshot_path = run_dir / "timeline_snapshot.json"
        _write_json(snapshot_path, render_timeline.to_dict())
        report.update(
            {
                "timeline_snapshot": _relative_to_project(snapshot_path),
                "render_summary": render_timeline.render_summary(),
                "template_id": render_timeline.template_id,
                "platform": render_timeline.platform,
                "caption_style": render_timeline.caption_style,
            }
        )

        emit("[Timeline Render] Rendering from saved scene plan.", "info", "validation")
        emit(f"   Project: {project.subject}", "info", "validation")
        emit(f"   Scenes: {len(render_timeline.scenes)}", "info", "validation")
        emit(f"   Planned duration: {render_timeline.total_duration}s", "info", "validation")
        for warning in render_timeline.all_warnings:
            emit(f"[!] {warning}", "warning", "validation")

        voice = render_options.get("voice") or "en_us_001"
        subtitles_position = render_options.get("subtitlesPosition") or "center,bottom"
        text_color = render_options.get("color") or "#FFFF00"
        threads = int(render_options.get("threads") or (os.cpu_count() or 2))
        use_music = bool(render_options.get("useMusic", False))

        used_asset_urls: set[str] = set()
        prepared_scenes: list[dict] = []
        asset_metadata: list[dict] = []
        current_time = 0.0

        for scene in render_timeline.scenes:
            guard_cancelled()
            emit(f"[+] Preparing scene {scene.index}: {scene.purpose}", "info", "scene_prepare")
            for warning in scene.warnings:
                emit(f"[!] Scene {scene.index}: {warning}", "warning", "scene_prepare")

            emit(f"[+] Searching asset for scene {scene.index}: {scene.visual_query}", "info", "asset")
            asset_path, metadata = _download_asset_for_scene(scene, assets_dir, used_asset_urls, emit, guard_cancelled)

            emit(f"[+] Generating voiceover for scene {scene.index}.", "info", "tts")
            audio_path = audio_dir / f"scene_{scene.index:02d}.mp3"
            _generate_scene_tts(scene, voice, audio_path)

            try:
                audio_clip_raw = AudioFileClip(str(audio_path))
            except Exception as err:
                raise TimelineRenderStageError("TTS", f"Scene {scene.index} audio file could not be read: {err}") from err
            source_audio_clips.append(audio_clip_raw)

            audio_duration = float(audio_clip_raw.duration or 0.0)
            if audio_duration <= 0:
                raise TimelineRenderStageError("TTS", f"Scene {scene.index} audio duration is zero.")

            effective_duration = max(float(scene.duration), audio_duration)
            if abs(effective_duration - scene.duration) > 0.25:
                emit(
                    f"[!] Scene {scene.index} duration adjusted from {scene.duration:g}s to {effective_duration:.2f}s to fit voiceover.",
                    "warning",
                    "timing",
                )

            emit(f"[+] Building visual clip for scene {scene.index}.", "info", "video_clip")
            try:
                scene_clip = _make_scene_clip(asset_path, effective_duration)
            except Exception as err:
                metadata["source"] = "fallback_color"
                metadata["path"] = None
                metadata["fallback_reason"] = f"Downloaded asset could not be rendered: {err}"
                emit(f"[!] Scene {scene.index} asset could not be rendered. Using fallback background.", "warning", "video_clip")
                scene_clip = _fallback_scene_clip(effective_duration)

            video_clips.append(scene_clip)
            audio_clips.append(audio_clip_raw.with_start(current_time))

            scene_payload = {
                "index": scene.index,
                "start": current_time,
                "end": current_time + effective_duration,
                "planned_duration": scene.duration,
                "duration": effective_duration,
                "voiceover": scene.voiceover,
                "caption": scene.caption,
                "visual_query": scene.visual_query,
                "asset": metadata,
                "audio_path": _relative_to_project(audio_path),
            }
            prepared_scenes.append(scene_payload)
            asset_metadata.append(metadata)
            current_time += effective_duration

        guard_cancelled()
        emit("[+] Combining scene videos.", "info", "combine")
        combined_video = concatenate_videoclips(video_clips, method="compose").with_fps(30).with_duration(current_time)
        combined_video_path = renders_dir / "combined_timeline.mp4"
        try:
            combined_video.write_videofile(
                str(combined_video_path),
                threads=threads,
                fps=30,
                codec="libx264",
                preset="medium",
                audio=False,
            )
        except Exception as err:
            raise TimelineRenderStageError("Video Combine", f"Could not combine scene clips: {err}") from err
        finally:
            combined_video.close()

        guard_cancelled()
        subtitles_path = subtitles_dir / "timeline.srt"
        emit("[+] Generating scene-level subtitles.", "info", "subtitle")
        try:
            _write_scene_srt(prepared_scenes, subtitles_path)
        except Exception as err:
            raise TimelineRenderStageError("Subtitle", f"Could not generate scene-level SRT: {err}") from err
        emit("[+] Scene-level subtitles generated.", "success", "subtitle")

        emit("[+] Building voiceover audio timeline.", "info", "audio_mix")
        try:
            timeline_audio = CompositeAudioClip(audio_clips).with_duration(current_time)
        except Exception as err:
            raise TimelineRenderStageError("Audio Mix", f"Could not build voiceover audio timeline: {err}") from err

        if use_music:
            song_path = choose_random_song()
            if song_path:
                emit("[+] Mixing background music.", "info", "audio_mix")
                try:
                    song_clip = AudioFileClip(song_path).with_fps(44100)
                    song_clip = song_clip.with_effects([afx.AudioLoop(duration=current_time)]).with_volume_scaled(0.1)
                    timeline_audio = CompositeAudioClip([timeline_audio, song_clip]).with_duration(current_time)
                except Exception as err:
                    emit(f"[!] Background music could not be mixed. Continuing without music: {err}", "warning", "audio_mix")
            else:
                emit("[!] Music requested but no MP3 files were found. Continuing without music.", "warning", "audio_mix")

        guard_cancelled()
        final_path = final_dir / "render.mp4"
        emit("[+] Rendering final subtitled video.", "info", "final_export")
        try:
            _render_subtitled_video(
                base_video_path=combined_video_path,
                audio=timeline_audio,
                subtitles_path=subtitles_path,
                output_path=final_path,
                subtitles_position=subtitles_position,
                text_color=text_color,
                threads=threads,
            )
        except Exception as err:
            raise TimelineRenderStageError("Final Export", f"Could not export final video: {err}") from err

        report.update(
            {
                "status": "completed",
                "completed_at": _now_iso(),
                "final_video": _relative_to_project(final_path),
                "subtitles": _relative_to_project(subtitles_path),
                "asset_metadata": asset_metadata,
                "scenes": prepared_scenes,
                "total_duration": current_time,
            }
        )
        _write_json(report_path, report)

        metadata_path = run_dir / "render_metadata.json"
        _write_json(
            metadata_path,
            {
                "project_id": project.id,
                "job_id": job_id,
                "timeline_snapshot": _relative_to_project(snapshot_path),
                "render_report": _relative_to_project(report_path),
                "final_video": _relative_to_project(final_path),
                "subtitles": _relative_to_project(subtitles_path),
                "asset_metadata": asset_metadata,
                "scenes": prepared_scenes,
                "total_duration": current_time,
            },
        )

        emit(f"[+] Timeline video generated: {_relative_to_project(final_path)}", "success", "complete")
        return _relative_to_project(final_path)
    except Exception as err:
        report.update(
            {
                "status": "failed",
                "failed_at": _now_iso(),
                "error": str(err),
                "error_stage": getattr(err, "stage", "unknown"),
            }
        )
        try:
            _write_json(report_path, report)
        except Exception:
            pass
        raise
    finally:
        if timeline_audio is not None:
            try:
                timeline_audio.close()
            except Exception:
                pass
        if song_clip is not None:
            try:
                song_clip.close()
            except Exception:
                pass
        for clip in video_clips:
            try:
                clip.close()
            except Exception:
                pass
        for clip in source_audio_clips:
            try:
                clip.close()
            except Exception:
                pass
