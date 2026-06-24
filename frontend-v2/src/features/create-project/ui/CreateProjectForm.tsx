import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { Template, TemplateId } from "@entities/template/model";
import type { PlatformId, VoiceStyle } from "@entities/timeline/model";
import { getModelFallbackFromError, toModelOptions } from "@entities/model";
import { api, getUserFacingApiError, queryKeys } from "@shared/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Textarea,
  useToast,
} from "@shared/ui";
import { formatDurationSeconds, humanizeIdentifier } from "@shared/lib";
import { TemplateGrid } from "@features/templates";
import {
  CAPTION_STYLE_OPTIONS,
  DEFAULT_CREATE_VALUES,
  LANGUAGE_OPTIONS,
  PLATFORM_OPTIONS,
  TARGET_DURATION_LIMITS,
  VOICE_STYLE_OPTIONS,
} from "../model";

type CreateProjectFormState = {
  subject: string;
  templateId: TemplateId;
  language: string;
  platform: PlatformId;
  targetDuration: number;
  voiceStyle: VoiceStyle;
  captionStyle: string;
  aiModel: string;
};

function getInitialState(): CreateProjectFormState {
  return {
    subject: "",
    templateId: DEFAULT_CREATE_VALUES.templateId,
    language: DEFAULT_CREATE_VALUES.language,
    platform: DEFAULT_CREATE_VALUES.platform,
    targetDuration: DEFAULT_CREATE_VALUES.targetDuration,
    voiceStyle: DEFAULT_CREATE_VALUES.voiceStyle,
    captionStyle: DEFAULT_CREATE_VALUES.captionStyle,
    aiModel: "",
  };
}

function clampTargetDuration(value: number): number {
  if (Number.isNaN(value)) {
    return TARGET_DURATION_LIMITS.min;
  }
  return Math.min(TARGET_DURATION_LIMITS.max, Math.max(TARGET_DURATION_LIMITS.min, Math.round(value)));
}

function getSubjectError(subject: string): string | null {
  if (!subject.trim()) {
    return "Subject is required. Backend will reject an empty videoSubject.";
  }
  if (subject.trim().length < 8) {
    return "Use at least 8 characters so the scene planner has enough context.";
  }
  return null;
}

export function CreateProjectForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState<CreateProjectFormState>(() => getInitialState());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: queryKeys.templates,
    queryFn: ({ signal }) => api.getTemplates(signal),
  });

  const modelsQuery = useQuery({
    queryKey: queryKeys.models,
    queryFn: ({ signal }) => api.getModels(signal),
  });

  const modelFallback = modelsQuery.isError ? getModelFallbackFromError(modelsQuery.error) : null;
  const modelResponse = modelsQuery.data ?? modelFallback;
  const modelOptions = useMemo(() => (modelResponse ? toModelOptions(modelResponse) : []), [modelResponse]);
  const templates = templatesQuery.data?.templates ?? [];

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === form.templateId) ?? templates[0] ?? null,
    [form.templateId, templates],
  );

  useEffect(() => {
    if (!selectedTemplate && templates.length > 0) {
      const firstTemplate = templates[0];
      setForm((current) => ({
        ...current,
        templateId: firstTemplate.id,
        targetDuration: firstTemplate.recommended_duration || current.targetDuration,
        captionStyle: firstTemplate.caption_style || current.captionStyle,
      }));
    }
  }, [selectedTemplate, templates]);

  useEffect(() => {
    if (!form.aiModel && modelResponse?.default) {
      setForm((current) => ({ ...current, aiModel: modelResponse.default }));
    }
  }, [form.aiModel, modelResponse?.default]);

  const createProjectMutation = useMutation({
    mutationFn: () =>
      api.createProject({
        videoSubject: form.subject.trim(),
        templateId: form.templateId,
        language: form.language,
        platform: form.platform,
        targetDuration: clampTargetDuration(form.targetDuration),
        voiceStyle: form.voiceStyle,
        captionStyle: form.captionStyle,
        ...(form.aiModel ? { aiModel: form.aiModel } : {}),
      }),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.setQueryData(queryKeys.project(response.project.id), response);
      showToast({
        tone: "success",
        title: "Scene plan created",
        description: "Opening the Studio workspace for timeline review.",
      });
      navigate(`/studio/${response.project.id}`);
    },
    onError: (error) => {
      setSubmitError(getUserFacingApiError(error));
    },
  });

  const subjectError = getSubjectError(form.subject);
  const durationError =
    form.targetDuration < TARGET_DURATION_LIMITS.min || form.targetDuration > TARGET_DURATION_LIMITS.max
      ? `Target duration must stay between ${TARGET_DURATION_LIMITS.min}s and ${TARGET_DURATION_LIMITS.max}s.`
      : null;
  const templatesUnavailable = templatesQuery.isError || (!templatesQuery.isLoading && templates.length === 0);
  const isSubmitDisabled =
    createProjectMutation.isPending || templatesQuery.isLoading || templatesUnavailable || Boolean(subjectError) || Boolean(durationError);

  function updateForm<TField extends keyof CreateProjectFormState>(field: TField, value: CreateProjectFormState[TField]) {
    setSubmitError(null);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleTemplateSelect(template: Template) {
    setSubmitError(null);
    setForm((current) => ({
      ...current,
      templateId: template.id,
      targetDuration: template.recommended_duration || current.targetDuration,
      captionStyle: template.caption_style || current.captionStyle,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    if (isSubmitDisabled) {
      return;
    }
    createProjectMutation.mutate();
  }

  return (
    <form className="create-flow" onSubmit={handleSubmit} noValidate>
      <section className="create-flow-main" aria-label="Create scene plan form">
        <Card>
          <CardHeader>
            <div className="create-section-heading">
              <div>
                <CardTitle>Brief</CardTitle>
                <CardDescription>
                  This is sent to POST /api/projects as <code>videoSubject</code>. No legacy /api/generate call is used.
                </CardDescription>
              </div>
              <Badge tone={form.subject.trim() ? "success" : "warning"}>{form.subject.trim() ? "Ready" : "Required"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="ui-page-section">
            <Field
              label="Video subject"
              htmlFor="video-subject"
              hint="Write the short-form idea, niche, angle, or source material. The backend will build the editable scene plan."
              error={form.subject ? subjectError : undefined}
            >
              <Textarea
                id="video-subject"
                value={form.subject}
                minLength={8}
                maxLength={900}
                placeholder="Example: 7 AI workflow mistakes faceless creators make before their shorts start scaling."
                onChange={(event) => updateForm("subject", event.target.value)}
                aria-invalid={Boolean(subjectError) || undefined}
              />
            </Field>
            <div className="create-character-row">
              <span>{form.subject.trim().length}/900 characters</span>
              <span>Backend field: videoSubject</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="create-section-heading">
              <div>
                <CardTitle>Template</CardTitle>
                <CardDescription>
                  Loaded only from GET /api/templates. IDs are preserved exactly as the backend provides them.
                </CardDescription>
              </div>
              {selectedTemplate ? <Badge tone="accent">{humanizeIdentifier(selectedTemplate.id)}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent>
            {templatesQuery.isError ? (
              <Alert title="Templates could not be loaded" tone="danger">
                <p>{getUserFacingApiError(templatesQuery.error)}</p>
                <div className="create-inline-actions">
                  <Button type="button" variant="secondary" size="sm" onClick={() => void templatesQuery.refetch()} isLoading={templatesQuery.isRefetching}>
                    Retry templates
                  </Button>
                </div>
              </Alert>
            ) : templates.length === 0 && !templatesQuery.isLoading ? (
              <Alert title="No templates returned" tone="warning">
                The Create Flow is blocked because the backend did not return any templates.
              </Alert>
            ) : (
              <TemplateGrid
                templates={templates}
                selectedTemplateId={form.templateId}
                onSelectTemplate={handleTemplateSelect}
                isLoading={templatesQuery.isLoading}
              />
            )}
          </CardContent>
        </Card>
      </section>

      <aside className="create-flow-sidebar" aria-label="Create settings">
        <Card>
          <CardHeader>
            <CardTitle>Production settings</CardTitle>
            <CardDescription>These values map directly to POST /api/projects request fields.</CardDescription>
          </CardHeader>
          <CardContent className="ui-page-section">
            <Field label="AI model" htmlFor="ai-model" hint="Loaded from GET /api/models. If Ollama reports an error with fallback models, the fallback remains selectable.">
              <Select
                id="ai-model"
                value={form.aiModel}
                disabled={!modelResponse || modelOptions.length === 0}
                onChange={(event) => updateForm("aiModel", event.target.value)}
              >
                {modelOptions.length === 0 ? <option value="">Model list unavailable</option> : null}
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}{option.isDefault ? " · default" : ""}
                  </option>
                ))}
              </Select>
            </Field>

            {modelsQuery.isError ? (
              <Alert title="Model endpoint warning" tone={modelFallback ? "warning" : "danger"}>
                <p>{getUserFacingApiError(modelsQuery.error)}</p>
                {modelFallback ? <p>Fallback model data from the backend response is still available.</p> : null}
              </Alert>
            ) : null}

            <Field label="Platform" htmlFor="platform">
              <Select id="platform" value={form.platform} onChange={(event) => updateForm("platform", event.target.value as PlatformId)}>
                {PLATFORM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Language" htmlFor="language">
              <Select id="language" value={form.language} onChange={(event) => updateForm("language", event.target.value)}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Target duration" htmlFor="target-duration" error={durationError ?? undefined}>
              <Input
                id="target-duration"
                type="number"
                min={TARGET_DURATION_LIMITS.min}
                max={TARGET_DURATION_LIMITS.max}
                value={form.targetDuration}
                onChange={(event) => updateForm("targetDuration", clampTargetDuration(Number(event.target.value)))}
                aria-invalid={Boolean(durationError) || undefined}
              />
            </Field>

            <Field label="Voice style" htmlFor="voice-style">
              <Select id="voice-style" value={form.voiceStyle} onChange={(event) => updateForm("voiceStyle", event.target.value as VoiceStyle)}>
                {VOICE_STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Caption style" htmlFor="caption-style">
              <Select id="caption-style" value={form.captionStyle} onChange={(event) => updateForm("captionStyle", event.target.value)}>
                {CAPTION_STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create summary</CardTitle>
            <CardDescription>No mock project is created. Submit calls the existing backend only.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="create-summary-list">
              <div>
                <dt>Template</dt>
                <dd>{selectedTemplate?.name ?? "Waiting for backend templates"}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{formatDurationSeconds(form.targetDuration)}</dd>
              </div>
              <div>
                <dt>Platform</dt>
                <dd>{humanizeIdentifier(form.platform)}</dd>
              </div>
              <div>
                <dt>Caption style</dt>
                <dd>{humanizeIdentifier(form.captionStyle)}</dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter className="create-submit-footer">
            {submitError ? (
              <Alert title="Scene plan was not created" tone="danger">
                {submitError}
              </Alert>
            ) : null}
            <Button type="submit" variant="primary" size="lg" isLoading={createProjectMutation.isPending} disabled={isSubmitDisabled}>
              Create scene plan
            </Button>
          </CardFooter>
        </Card>
      </aside>
    </form>
  );
}
