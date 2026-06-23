import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from sqlalchemy import and_, case, select

from db import SessionLocal, init_db
from gpt import list_ollama_models
from planner import build_timeline
from timeline_adapter import TimelineValidationError, validate_and_adapt_timeline
from templates import get_template, list_templates, template_ids
from logstream import log
from repository import (
    create_job,
    create_video_project,
    get_job,
    get_video_project,
    list_job_events,
    list_video_projects,
    request_cancel,
    update_video_project_status,
    update_video_project_timeline,
)
from utils import ENV_FILE, PROJECT_ROOT, SONGS_DIR, check_env_vars, clean_dir


load_dotenv(ENV_FILE)
check_env_vars()
init_db()

app = Flask(__name__)
CORS(app)

HOST = "0.0.0.0"
PORT = 8080



def _project_payload(project):
    return {
        "id": project.id,
        "subject": project.subject,
        "templateId": project.template_id,
        "language": project.language,
        "platform": project.platform,
        "targetDuration": project.target_duration,
        "voiceStyle": project.voice_style,
        "captionStyle": project.caption_style,
        "status": project.status,
        "timeline": project.timeline_json,
        "metadata": project.metadata_json,
        "createdAt": project.created_at.isoformat() if project.created_at else None,
        "updatedAt": project.updated_at.isoformat() if project.updated_at else None,
    }

def _result_url(path):
    if not path:
        return None
    safe_path = str(path).replace("\\", "/").lstrip("/")
    return f"/api/files/{safe_path}"



def _clean_string(value, default=""):
    if value is None:
        return default
    value = str(value).strip()
    return value if value else default


def _clean_int(value, default=40, minimum=15, maximum=90):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


@app.route("/api/templates", methods=["GET"])
def templates_index():
    return jsonify({"status": "success", "templates": list_templates()})


@app.route("/api/projects", methods=["GET"])
def projects_index():
    with SessionLocal() as session:
        projects = list_video_projects(session)
        return jsonify(
            {
                "status": "success",
                "projects": [_project_payload(project) for project in projects],
            }
        )


@app.route("/api/projects", methods=["POST"])
def create_project_plan():
    data = request.get_json() or {}
    subject = _clean_string(data.get("videoSubject") or data.get("subject"))
    if not subject:
        return jsonify({"status": "error", "message": "videoSubject is required."}), 400

    requested_template = _clean_string(data.get("templateId"), "top_5_listicle")
    if requested_template not in template_ids():
        return jsonify({"status": "error", "message": "Unknown templateId."}), 400

    language = _clean_string(data.get("language"), "English")
    platform = _clean_string(data.get("platform"), "youtube_shorts")
    target_duration = _clean_int(data.get("targetDuration") or data.get("duration"))
    voice_style = _clean_string(data.get("voiceStyle") or data.get("voice"), "neutral")
    caption_style = _clean_string(data.get("captionStyle"), get_template(requested_template).get("caption_style", "bold_viral"))
    ai_model = _clean_string(data.get("aiModel"), os.getenv("OLLAMA_MODEL", "llama3.1:8b"))

    with SessionLocal() as session:
        project = create_video_project(
            session,
            subject=subject,
            template_id=requested_template,
            language=language,
            platform=platform,
            target_duration=target_duration,
            voice_style=voice_style,
            caption_style=caption_style,
            metadata_json={"source": "project_creator"},
        )

    timeline = build_timeline(
        project_id=project.id,
        subject=subject,
        template_id=requested_template,
        language=language,
        platform=platform,
        target_duration=target_duration,
        ai_model=ai_model,
        voice_style=voice_style,
        caption_style=caption_style,
    )

    with SessionLocal() as session:
        project = update_video_project_timeline(session, project.id, timeline, status="planned")

    return jsonify(
        {
            "status": "success",
            "message": "Scene plan created.",
            "project": _project_payload(project),
        }
    )


@app.route("/api/projects/<project_id>", methods=["GET"])
def get_project(project_id: str):
    with SessionLocal() as session:
        project = get_video_project(session, project_id)
        if not project:
            return jsonify({"status": "error", "message": "Project not found."}), 404
        return jsonify({"status": "success", "project": _project_payload(project)})


@app.route("/api/projects/<project_id>/timeline", methods=["PUT"])
def update_project_timeline(project_id: str):
    data = request.get_json() or {}
    timeline = data.get("timeline")
    if not isinstance(timeline, dict):
        return jsonify({"status": "error", "message": "timeline object is required."}), 400

    with SessionLocal() as session:
        project = update_video_project_timeline(session, project_id, timeline, status="editing")
        if not project:
            return jsonify({"status": "error", "message": "Project not found."}), 404
        return jsonify(
            {
                "status": "success",
                "message": "Timeline saved.",
                "project": _project_payload(project),
            }
        )


@app.route("/api/projects/<project_id>/render", methods=["POST"])
def render_project_timeline(project_id: str):
    data = request.get_json() or {}
    render_options = {
        "voice": _clean_string(data.get("voice"), "en_us_001"),
        "subtitlesPosition": _clean_string(data.get("subtitlesPosition"), "center,bottom"),
        "color": _clean_string(data.get("color"), "#FFFF00"),
        "threads": data.get("threads") or 2,
        "useMusic": bool(data.get("useMusic", False)),
    }

    with SessionLocal() as session:
        project = get_video_project(session, project_id)
        if not project:
            return jsonify({"status": "error", "message": "Project not found."}), 404

        try:
            adapted = validate_and_adapt_timeline(
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
        except TimelineValidationError as err:
            return jsonify({"status": "error", "message": str(err)}), 400

        job = create_job(
            session,
            payload={
                "mode": "timeline_render",
                "projectId": project.id,
                "renderOptions": render_options,
                "timelineSummary": adapted.render_summary(),
            },
        )
        project = update_video_project_status(
            session,
            project.id,
            "render_queued",
            {"activeRenderJobId": job.id, "timelineRenderWarnings": adapted.all_warnings},
        )

    return jsonify(
        {
            "status": "success",
            "message": "Timeline render queued.",
            "jobId": job.id,
            "summary": adapted.render_summary(),
            "project": _project_payload(project),
        }
    )


@app.route("/api/projects/<project_id>/timeline/validate", methods=["POST"])
def validate_project_timeline(project_id: str):
    data = request.get_json() or {}
    timeline = data.get("timeline")

    with SessionLocal() as session:
        project = get_video_project(session, project_id)
        if not project:
            return jsonify({"status": "error", "message": "Project not found."}), 404
        candidate_timeline = timeline if isinstance(timeline, dict) else project.timeline_json
        try:
            adapted = validate_and_adapt_timeline(
                candidate_timeline,
                project_id=project.id,
                subject=project.subject,
                template_id=project.template_id,
                language=project.language,
                platform=project.platform,
                target_duration=project.target_duration,
                voice_style=project.voice_style,
                caption_style=project.caption_style,
            )
        except TimelineValidationError as err:
            return jsonify({"status": "error", "message": str(err)}), 400

    return jsonify(
        {
            "status": "success",
            "message": "Timeline is renderable.",
            "summary": adapted.render_summary(),
        }
    )


@app.route("/api/files/<path:relative_path>", methods=["GET"])
def serve_project_file(relative_path: str):
    safe_path = relative_path.replace("\\", "/").lstrip("/")
    if ".." in safe_path.split("/"):
        return jsonify({"status": "error", "message": "Invalid path."}), 400
    file_path = (PROJECT_ROOT / safe_path).resolve()
    try:
        file_path.relative_to(PROJECT_ROOT.resolve())
    except ValueError:
        return jsonify({"status": "error", "message": "Invalid path."}), 400
    if not file_path.exists() or not file_path.is_file():
        return jsonify({"status": "error", "message": "File not found."}), 404
    return send_from_directory(PROJECT_ROOT, safe_path, as_attachment=False)


@app.route("/api/models", methods=["GET"])
def models():
    try:
        available_models, default_model = list_ollama_models()
        return jsonify(
            {
                "status": "success",
                "models": available_models,
                "default": default_model,
            }
        )
    except Exception as err:
        log(f"[-] Error fetching Ollama models: {str(err)}", "error")
        return jsonify(
            {
                "status": "error",
                "message": "Could not fetch Ollama models. Is Ollama running?",
                "models": [os.getenv("OLLAMA_MODEL", "llama3.1:8b")],
                "default": os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
            }
        )


@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.get_json() or {}
    if not data.get("videoSubject"):
        return jsonify({"status": "error", "message": "videoSubject is required."}), 400

    with SessionLocal() as session:
        job = create_job(session, payload=data)

    return jsonify(
        {
            "status": "success",
            "message": "Video generation queued.",
            "jobId": job.id,
        }
    )


@app.route("/api/jobs/<job_id>", methods=["GET"])
def get_job_status(job_id: str):
    with SessionLocal() as session:
        job = get_job(session, job_id)
        if not job:
            return jsonify({"status": "error", "message": "Job not found."}), 404

        return jsonify(
            {
                "status": "success",
                "job": {
                    "id": job.id,
                    "state": job.status,
                    "cancelRequested": job.cancel_requested,
                    "resultPath": job.result_path,
                    "resultUrl": _result_url(job.result_path),
                    "errorMessage": job.error_message,
                    "createdAt": job.created_at.isoformat() if job.created_at else None,
                    "startedAt": job.started_at.isoformat() if job.started_at else None,
                    "completedAt": job.completed_at.isoformat()
                    if job.completed_at
                    else None,
                },
            }
        )


@app.route("/api/jobs/<job_id>/events", methods=["GET"])
def get_events(job_id: str):
    after_id = request.args.get("after", default=0, type=int)

    with SessionLocal() as session:
        job = get_job(session, job_id)
        if not job:
            return jsonify({"status": "error", "message": "Job not found."}), 404

        events = list_job_events(session, job_id, after_id=after_id)
        return jsonify(
            {
                "status": "success",
                "events": [
                    {
                        "id": event.id,
                        "type": event.event_type,
                        "level": event.level,
                        "message": event.message,
                        "payload": event.payload,
                        "timestamp": event.created_at.timestamp()
                        if event.created_at
                        else None,
                    }
                    for event in events
                ],
            }
        )


@app.route("/api/jobs/<job_id>/cancel", methods=["POST"])
def cancel_job(job_id: str):
    with SessionLocal() as session:
        cancelled = request_cancel(session, job_id)
        if not cancelled:
            return jsonify({"status": "error", "message": "Job not found."}), 404

    return jsonify({"status": "success", "message": "Cancellation requested."})


@app.route("/api/upload-songs", methods=["POST"])
def upload_songs():
    try:
        files = request.files.getlist("songs")
        if not files:
            return jsonify({"status": "error", "message": "No files uploaded."}), 400

        clean_dir(str(SONGS_DIR))
        saved = 0
        for file_item in files:
            if file_item.filename and file_item.filename.lower().endswith(".mp3"):
                safe_name = os.path.basename(file_item.filename)
                file_item.save(str(SONGS_DIR / safe_name))
                saved += 1

        if saved == 0:
            return jsonify({"status": "error", "message": "No MP3 files found."}), 400

        log(f"[+] Uploaded {saved} song(s) to {SONGS_DIR}", "success")
        return jsonify({"status": "success", "message": f"Uploaded {saved} song(s)."})
    except Exception as err:
        log(f"[-] Error uploading songs: {str(err)}", "error")
        return jsonify({"status": "error", "message": str(err)}), 500


@app.route("/api/cancel", methods=["POST"])
def cancel_latest_running_job():
    with SessionLocal() as session:
        from models import GenerationJob

        stmt = (
            select(GenerationJob)
            .where(and_(GenerationJob.status.in_(["queued", "running"])))
            .order_by(
                case((GenerationJob.status == "running", 0), else_=1),
                GenerationJob.created_at.desc(),
            )
            .limit(1)
        )
        latest_job = session.scalars(stmt).first()
        if not latest_job:
            return jsonify({"status": "error", "message": "No active job found."}), 404

        request_cancel(session, latest_job.id)

    return jsonify(
        {
            "status": "success",
            "message": "Cancellation requested.",
            "jobId": latest_job.id,
        }
    )


if __name__ == "__main__":
    app.run(debug=True, host=HOST, port=PORT, threaded=True)
