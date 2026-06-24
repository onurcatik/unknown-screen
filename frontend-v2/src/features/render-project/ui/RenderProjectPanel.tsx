import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RenderJob, RenderJobEvent, RenderOptions } from "@entities/job/model";
import { isTerminalJobState, shouldShowResult } from "@entities/job/model";
import type { VideoProject } from "@entities/project/model";
import type { TimelineRenderSummary } from "@entities/timeline/model";
import { api, getUserFacingApiError, queryKeys } from "@shared/api";
import { formatDateTime, humanizeIdentifier } from "@shared/lib";
import { Alert, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Select, useToast } from "@shared/ui";
import {
  clampRenderThreads,
  createDefaultRenderOptions,
  getEventTone,
  getInitialRenderJobId,
  getJobTone,
  getLastEventId,
  getValidationGate,
  mergeJobEvents,
  sanitizeRenderOptions,
  summarizeValidation,
  validationHasBlockingErrors,
} from "../model";

interface RenderProjectPanelProps {
  project: VideoProject;
  isTimelineDirty: boolean;
}

export function RenderProjectPanel({ project, isTimelineDirty }: RenderProjectPanelProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [renderOptions, setRenderOptions] = useState<Required<RenderOptions>>(() => createDefaultRenderOptions());
  const [activeJobId, setActiveJobId] = useState<string | null>(() => getInitialRenderJobId(project));
  const [events, setEvents] = useState<RenderJobEvent[]>([]);
  const [lastEventId, setLastEventId] = useState(0);
  const [eventError, setEventError] = useState<string | null>(null);
  const [validationSummary, setValidationSummary] = useState<TimelineRenderSummary | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const eventPanelRef = useRef<HTMLDivElement | null>(null);
  const lastEventIdRef = useRef(0);
  const eventErrorToastShownRef = useRef(false);

  const gate = useMemo(() => getValidationGate(project, isTimelineDirty), [project, isTimelineDirty]);

  useEffect(() => {
    const nextJobId = getInitialRenderJobId(project);
    if (nextJobId && nextJobId !== activeJobId) {
      setActiveJobId(nextJobId);
      setEvents([]);
      setLastEventId(0);
      lastEventIdRef.current = 0;
      setEventError(null);
      eventErrorToastShownRef.current = false;
    }
  }, [activeJobId, project]);

  const jobQuery = useQuery({
    queryKey: activeJobId ? queryKeys.job(activeJobId) : ["job", "missing-id"],
    queryFn: ({ signal }) => {
      if (!activeJobId) {
        throw new Error("No active render job id is available.");
      }
      return api.getJob(activeJobId, signal);
    },
    enabled: Boolean(activeJobId),
    refetchInterval: (query) => {
      const data = query.state.data as Awaited<ReturnType<typeof api.getJob>> | undefined;
      if (!data?.job) {
        return activeJobId ? 2500 : false;
      }
      return isTerminalJobState(data.job.state) ? false : 2500;
    },
  });

  const job = jobQuery.data?.job ?? null;

  useEffect(() => {
    if (!activeJobId) {
      setEvents([]);
      setLastEventId(0);
      lastEventIdRef.current = 0;
      setEventError(null);
      eventErrorToastShownRef.current = false;
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const loadEvents = async () => {
      try {
        const response = await api.getJobEvents(activeJobId, lastEventIdRef.current);
        if (cancelled) return;

        setEventError(null);
        eventErrorToastShownRef.current = false;

        if (response.events.length > 0) {
          setEvents((current) => mergeJobEvents(current, response.events));
          const nextLastEventId = Math.max(lastEventIdRef.current, getLastEventId(response.events));
          lastEventIdRef.current = nextLastEventId;
          setLastEventId(nextLastEventId);
        }
      } catch (error) {
        if (cancelled) return;
        const message = getUserFacingApiError(error);
        setEventError(message);
        if (!eventErrorToastShownRef.current) {
          showToast({ tone: "danger", title: "Render events failed", description: message });
          eventErrorToastShownRef.current = true;
        }
      }
    };

    void loadEvents();

    if (!job || !isTerminalJobState(job.state)) {
      timer = window.setInterval(() => {
        void loadEvents();
      }, 2500);
    }

    return () => {
      cancelled = true;
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, [activeJobId, job?.state, showToast]);

  useEffect(() => {
    if (eventPanelRef.current) {
      eventPanelRef.current.scrollTop = eventPanelRef.current.scrollHeight;
    }
  }, [events.length]);

  const validateMutation = useMutation({
    mutationFn: () => api.validateTimeline(project.id, project.timeline ?? undefined),
    onSuccess: (response) => {
      setValidationSummary(response.summary);
      setValidationMessage(response.message ?? "Timeline validation completed.");
      const tone = validationHasBlockingErrors(response.summary) ? "warning" : "success";
      showToast({ tone, title: "Timeline validated", description: summarizeValidation(response.summary) });
    },
    onError: (error) => {
      const message = getUserFacingApiError(error);
      setValidationSummary(null);
      setValidationMessage(message);
      showToast({ tone: "danger", title: "Validation failed", description: message });
    },
  });

  const renderMutation = useMutation({
    mutationFn: async () => {
      const validation = await api.validateTimeline(project.id, project.timeline ?? undefined);
      if (validationHasBlockingErrors(validation.summary)) {
        throw new Error("Backend validation returned a blocking timeline summary. Fix the saved timeline before render.");
      }
      setValidationSummary(validation.summary);
      setValidationMessage(validation.message ?? "Timeline validation completed.");
      return api.renderProject(project.id, sanitizeRenderOptions(renderOptions));
    },
    onSuccess: (response) => {
      setActiveJobId(response.jobId);
      setEvents([]);
      setLastEventId(0);
      lastEventIdRef.current = 0;
      setEventError(null);
      eventErrorToastShownRef.current = false;
      queryClient.setQueryData(queryKeys.project(project.id), { status: response.status, project: response.project, message: response.message });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) });
      showToast({ tone: "success", title: "Render queued", description: response.message ?? `Job ${response.jobId} is now tracked.` });
    },
    onError: (error) => {
      const message = getUserFacingApiError(error);
      showToast({ tone: "danger", title: "Could not queue render", description: message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!activeJobId) {
        throw new Error("No active render job id is available.");
      }
      return api.cancelJob(activeJobId);
    },
    onSuccess: (response) => {
      if (activeJobId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.job(activeJobId) });
      }
      showToast({ tone: "warning", title: "Cancel requested", description: response.message ?? "The backend has received the cancel request." });
    },
    onError: (error) => {
      const message = getUserFacingApiError(error);
      showToast({ tone: "danger", title: "Could not cancel job", description: message });
    },
  });

  const resultUrl = api.buildFileUrl(job?.resultUrl ?? job?.resultPath ?? null);
  const hasActiveNonTerminalJob = Boolean(activeJobId && (!job || !isTerminalJobState(job.state)));
  const canCancel = Boolean(activeJobId && job && !isTerminalJobState(job.state) && !cancelMutation.isPending);
  const canValidate = gate.canValidate && !validateMutation.isPending && !renderMutation.isPending;
  const canQueueRender = gate.canQueueRender && !validateMutation.isPending && !renderMutation.isPending && !hasActiveNonTerminalJob;

  function requestCancelJob() {
    if (!activeJobId || cancelMutation.isPending) {
      return;
    }
    const confirmed = window.confirm("Cancel this render job? The request is sent to POST /api/jobs/:jobId/cancel and the worker decides when it stops.");
    if (confirmed) {
      cancelMutation.mutate();
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="render-panel-heading">
          <div>
            <CardTitle>Validation + Render Observatory</CardTitle>
            <CardDescription>Validate the saved backend timeline, queue render, poll job state, stream incremental events, and preview completed output.</CardDescription>
          </div>
          {job ? <Badge tone={getJobTone(job)}>{humanizeIdentifier(job.state)}</Badge> : <Badge tone="neutral">No active job</Badge>}
        </div>
      </CardHeader>
      <CardContent className="ui-page-section">
        {!gate.canValidate ? (
          <Alert title="Render gate is closed" tone="warning">
            {gate.reason}
          </Alert>
        ) : hasActiveNonTerminalJob ? (
          <Alert title="Active render is already being tracked" tone="info">
            Queue render is locked until the current job reaches completed, failed, or cancelled. This prevents duplicate render jobs from repeated clicks.
          </Alert>
        ) : (
          <Alert title="Render gate is open" tone="success">
            Saved timeline is available. Queue render will validate first, then call POST /api/projects/:projectId/render.
          </Alert>
        )}

        <div className="render-options-grid">
          <Field label="Voice" htmlFor="render-voice" hint="Passed as render option voice. Empty values are normalized before render.">
            <Input
              id="render-voice"
              value={renderOptions.voice}
              onChange={(event) => setRenderOptions((current) => ({ ...current, voice: event.target.value }))}
            />
          </Field>
          <Field label="Subtitles position" htmlFor="render-subtitles-position">
            <Select
              id="render-subtitles-position"
              value={renderOptions.subtitlesPosition}
              onChange={(event) => setRenderOptions((current) => ({ ...current, subtitlesPosition: event.target.value }))}
            >
              <option value="center,bottom">Center bottom</option>
              <option value="center,center">Center middle</option>
              <option value="center,top">Center top</option>
            </Select>
          </Field>
          <Field label="Subtitle color" htmlFor="render-color">
            <Input
              id="render-color"
              type="color"
              value={renderOptions.color}
              onChange={(event) => setRenderOptions((current) => ({ ...current, color: event.target.value }))}
            />
          </Field>
          <Field label="Threads" htmlFor="render-threads" hint="Clamped between 1 and 8 before the backend request.">
            <Input
              id="render-threads"
              type="number"
              min={1}
              max={8}
              value={renderOptions.threads}
              onChange={(event) => setRenderOptions((current) => ({ ...current, threads: clampRenderThreads(Number(event.target.value)) }))}
            />
          </Field>
          <Field label="Use music" htmlFor="render-use-music" hint="Only toggles the backend render option; this panel does not fabricate music assets.">
            <Select
              id="render-use-music"
              value={renderOptions.useMusic ? "true" : "false"}
              onChange={(event) => setRenderOptions((current) => ({ ...current, useMusic: event.target.value === "true" }))}
            >
              <option value="false">No music</option>
              <option value="true">Use uploaded music if backend has it</option>
            </Select>
          </Field>
        </div>

        <div className="render-action-row">
          <Button variant="secondary" onClick={() => validateMutation.mutate()} isLoading={validateMutation.isPending} disabled={!canValidate}>
            Validate timeline
          </Button>
          <Button variant="primary" onClick={() => renderMutation.mutate()} isLoading={renderMutation.isPending} disabled={!canQueueRender}>
            Queue render
          </Button>
          <Button variant="danger" onClick={requestCancelJob} isLoading={cancelMutation.isPending} disabled={!canCancel}>
            Cancel job
          </Button>
        </div>

        <ValidationResult summary={validationSummary} message={validationMessage} />
        <JobStatePanel job={job} jobId={activeJobId} isLoading={jobQuery.isFetching} error={jobQuery.error} onRetry={() => jobQuery.refetch()} />
        <JobEventsLog
          events={events}
          lastEventId={lastEventId}
          eventError={eventError}
          eventPanelRef={eventPanelRef}
          onClear={() => setEvents([])}
          onRetry={() => {
            setEventError(null);
            eventErrorToastShownRef.current = false;
            queryClient.invalidateQueries({ queryKey: activeJobId ? queryKeys.job(activeJobId) : ["job", "missing-id"] });
          }}
        />
        <ResultPreview job={job} resultUrl={resultUrl} />
      </CardContent>
    </Card>
  );
}

function ValidationResult({ summary, message }: { summary: TimelineRenderSummary | null; message: string | null }) {
  if (!summary && !message) {
    return (
      <Alert title="No validation run yet" tone="info">
        Validation is explicit. The render button also runs backend validation before queueing a job.
      </Alert>
    );
  }

  if (!summary) {
    return (
      <Alert title="Validation did not produce a summary" tone="danger">
        {message ?? "The backend response did not include a validation summary."}
      </Alert>
    );
  }

  return (
    <div className="render-validation-result">
      <Alert title="Validation summary" tone={validationHasBlockingErrors(summary) ? "warning" : "success"}>
        {message ?? "Timeline validation completed."}
      </Alert>
      <dl className="render-summary-grid">
        <div>
          <dt>Scenes</dt>
          <dd>{summary.sceneCount}</dd>
        </div>
        <div>
          <dt>Total duration</dt>
          <dd>{summary.totalDuration}s</dd>
        </div>
        <div>
          <dt>Platform</dt>
          <dd>{humanizeIdentifier(summary.platform)}</dd>
        </div>
        <div>
          <dt>Template</dt>
          <dd>{humanizeIdentifier(summary.templateId)}</dd>
        </div>
      </dl>
      {summary.warnings.length > 0 || summary.qualityWarnings.length > 0 ? (
        <div className="render-warning-block">
          <strong>Backend warnings</strong>
          <ul>
            {[...summary.warnings, ...summary.qualityWarnings].map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function JobStatePanel({
  job,
  jobId,
  isLoading,
  error,
  onRetry,
}: {
  job: RenderJob | null;
  jobId: string | null;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (!jobId) {
    return (
      <Alert title="No active render job" tone="info">
        Queue a render to start job polling. The UI does not invent global render history because the backend has no list-jobs endpoint.
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert title="Job polling failed" tone="danger">
        <p>{getUserFacingApiError(error)}</p>
        <Button variant="secondary" size="sm" onClick={onRetry}>Retry job polling</Button>
      </Alert>
    );
  }

  if (!job) {
    return (
      <Alert title="Loading render job" tone="info">
        Reading GET /api/jobs/:jobId for {jobId}. {isLoading ? "Polling is active." : null}
      </Alert>
    );
  }

  return (
    <div className="render-job-state-card">
      <div className="render-job-state-title">
        <Badge tone={getJobTone(job)}>{humanizeIdentifier(job.state)}</Badge>
        <span>{isTerminalJobState(job.state) ? "Terminal state reached; polling stops." : "Polling active."}</span>
      </div>
      <dl className="render-summary-grid">
        <div>
          <dt>Job ID</dt>
          <dd>{job.id}</dd>
        </div>
        <div>
          <dt>Cancel requested</dt>
          <dd>{job.cancelRequested ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{formatDateTime(job.startedAt)}</dd>
        </div>
        <div>
          <dt>Completed</dt>
          <dd>{formatDateTime(job.completedAt)}</dd>
        </div>
      </dl>
      {job.errorMessage ? <Alert title="Backend render error" tone="danger">{job.errorMessage}</Alert> : null}
    </div>
  );
}

function JobEventsLog({
  events,
  lastEventId,
  eventError,
  eventPanelRef,
  onClear,
  onRetry,
}: {
  events: RenderJobEvent[];
  lastEventId: number;
  eventError: string | null;
  eventPanelRef: MutableRefObject<HTMLDivElement | null>;
  onClear: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="render-events-section">
      <div className="render-events-header">
        <div>
          <strong>Incremental event log</strong>
          <p>Loaded through GET /api/jobs/:jobId/events?after=:eventId. Last seen event id: {lastEventId}.</p>
        </div>
        <div className="render-events-actions">
          <Button variant="ghost" size="sm" onClick={onRetry} disabled={!eventError}>Retry events</Button>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={events.length === 0}>Clear view</Button>
        </div>
      </div>
      {eventError ? <Alert title="Event polling degraded" tone="warning">{eventError}</Alert> : null}
      <div className="render-events-log" ref={eventPanelRef} aria-live="polite" aria-label="Render job events">
        {events.length === 0 ? (
          <p className="render-events-empty">No events loaded yet.</p>
        ) : (
          events.map((event) => (
            <div className="render-event-row" key={event.id}>
              <Badge tone={getEventTone(event)}>{humanizeIdentifier(event.level || event.type)}</Badge>
              <div>
                <strong>#{event.id} · {humanizeIdentifier(event.type)}</strong>
                <p>{event.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ResultPreview({ job, resultUrl }: { job: RenderJob | null; resultUrl: string | null }) {
  if (!job || !shouldShowResult(job)) {
    return null;
  }

  if (!resultUrl) {
    return (
      <Alert title="Render completed without a frontend-safe result URL" tone="warning">
        Backend marked the job completed, but no resultUrl/resultPath could be converted into /api/files/:relativePath.
      </Alert>
    );
  }

  return (
    <div className="render-result-preview">
      <div className="render-events-header">
        <div>
          <strong>Result preview</strong>
          <p>Video preview is shown only after the backend returns a completed job with a result URL/path.</p>
        </div>
        <a className="primary-link" href={resultUrl} target="_blank" rel="noreferrer">Open result</a>
      </div>
      <video className="render-video-preview" controls src={resultUrl} />
    </div>
  );
}
