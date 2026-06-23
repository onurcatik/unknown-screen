import time

from dotenv import load_dotenv

from db import SessionLocal, init_db
from pipeline import PipelineCancelled, run_generation_pipeline
from timeline_pipeline import run_timeline_render_pipeline
from repository import (
    append_event,
    claim_next_queued_job,
    get_job,
    get_video_project,
    mark_cancelled,
    mark_completed,
    mark_failed,
    update_video_project_status,
)
from utils import ENV_FILE, SUBTITLES_DIR, TEMP_DIR, check_env_vars, clean_dir


POLL_SECONDS = 1.0


def _job_cancelled(job_id: str) -> bool:
    with SessionLocal() as session:
        job = get_job(session, job_id)
        if not job:
            return True
        return bool(job.cancel_requested or job.status == "cancelled")


def _log_event(job_id: str, message: str, level: str) -> None:
    with SessionLocal() as session:
        append_event(session, job_id, "log", level, str(message))
        session.commit()


def process_next_job() -> bool:
    with SessionLocal() as session:
        job = claim_next_queued_job(session)

    if not job:
        return False

    job_id = job.id
    payload = job.payload or {}
    mode = payload.get("mode")

    try:
        if mode == "timeline_render":
            project_id = payload.get("projectId")
            with SessionLocal() as session:
                project = get_video_project(session, project_id) if project_id else None
                if not project:
                    raise RuntimeError("Project not found for timeline render job.")
                update_video_project_status(
                    session,
                    project.id,
                    "rendering",
                    {"activeRenderJobId": job_id},
                )

            result_path = run_timeline_render_pipeline(
                project=project,
                render_options=payload.get("renderOptions") or {},
                job_id=job_id,
                is_cancelled=lambda: _job_cancelled(job_id),
                on_log=lambda message, level: _log_event(job_id, message, level),
            )
            with SessionLocal() as session:
                mark_completed(session, job_id, result_path)
                update_video_project_status(
                    session,
                    project.id,
                    "rendered",
                    {"lastRenderJobId": job_id, "lastRenderPath": result_path},
                )
        else:
            clean_dir(str(TEMP_DIR))
            clean_dir(str(SUBTITLES_DIR))
            result_path = run_generation_pipeline(
                data=payload,
                is_cancelled=lambda: _job_cancelled(job_id),
                on_log=lambda message, level: _log_event(job_id, message, level),
            )
            with SessionLocal() as session:
                mark_completed(session, job_id, result_path)
    except PipelineCancelled as err:
        with SessionLocal() as session:
            mark_cancelled(session, job_id, str(err))
            if mode == "timeline_render" and payload.get("projectId"):
                update_video_project_status(
                    session,
                    payload["projectId"],
                    "editing",
                    {"lastRenderError": str(err)},
                )
    except Exception as err:
        with SessionLocal() as session:
            mark_failed(session, job_id, str(err))
            if mode == "timeline_render" and payload.get("projectId"):
                update_video_project_status(
                    session,
                    payload["projectId"],
                    "render_failed",
                    {"lastRenderJobId": job_id, "lastRenderError": str(err)},
                )

    return True


def main() -> None:
    load_dotenv(ENV_FILE)
    check_env_vars()
    init_db()

    while True:
        processed = process_next_job()
        if not processed:
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
