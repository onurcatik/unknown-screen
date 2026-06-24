import { useEffect, useMemo, useState } from "react";
import type { VideoProject } from "@entities/project/model";
import type { Timeline, TimelineScene } from "@entities/timeline/model";
import { toBackendTimelineScene } from "@entities/timeline/model";
import { RenderProjectPanel } from "@features/render-project";
import { useUnsavedChangesGuard } from "@shared/hooks";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@shared/ui";
import {
  cloneTimelineForEditing,
  createSceneDraft,
  getTimelineFingerprint,
  hasBlockingEditIssue,
  moveScene,
  normalizeTimelineBeforeSave,
  removeScene,
} from "../model";
import { SceneCard } from "./SceneCard";
import { TimelineMetaEditor } from "./TimelineMetaEditor";
import { TimelineStatsPanel } from "./TimelineStatsPanel";

interface TimelineEditorProps {
  project: VideoProject;
  isSaving: boolean;
  onSave: (timeline: Timeline) => void;
}

function duplicateScene(scene: TimelineScene, nextIndex: number): TimelineScene {
  return toBackendTimelineScene(
    {
      ...scene,
      caption: scene.caption ? `${scene.caption} copy` : "Draft caption copy",
    },
    nextIndex,
  );
}

export function TimelineEditor({ project, isSaving, onSave }: TimelineEditorProps) {
  const projectTimeline = project.timeline;
  const [draftTimeline, setDraftTimeline] = useState<Timeline | null>(() =>
    projectTimeline ? cloneTimelineForEditing(projectTimeline) : null,
  );

  useEffect(() => {
    setDraftTimeline(projectTimeline ? cloneTimelineForEditing(projectTimeline) : null);
  }, [project.id, projectTimeline]);

  const serverFingerprint = useMemo(() => getTimelineFingerprint(projectTimeline), [projectTimeline]);
  const draftFingerprint = useMemo(() => getTimelineFingerprint(draftTimeline), [draftTimeline]);
  const isDirty = Boolean(draftTimeline && draftFingerprint !== serverFingerprint);
  const hasBlockingIssues = hasBlockingEditIssue(draftTimeline);

  useUnsavedChangesGuard(isDirty && !isSaving);

  if (!draftTimeline) {
    return (
      <EmptyState
        eyebrow="No backend timeline"
        title="This project has no timeline to edit."
        description="Studio does not fabricate timeline data. Create a scene plan through /create so the backend can generate the initial timeline JSON."
      />
    );
  }

  const updateScene = (sceneIndex: number, scene: TimelineScene) => {
    setDraftTimeline((current) => {
      if (!current) return current;
      const scenes = current.scenes.map((item, index) => (index === sceneIndex ? toBackendTimelineScene(scene, index + 1) : item));
      return { ...current, scenes };
    });
  };

  const addScene = () => {
    setDraftTimeline((current) => {
      if (!current) return current;
      const nextScene = createSceneDraft(current.scenes.length + 1, project);
      return { ...current, scenes: [...current.scenes, nextScene] };
    });
  };

  const saveTimeline = () => {
    if (!draftTimeline || isSaving || hasBlockingIssues || !isDirty) return;
    onSave(normalizeTimelineBeforeSave(draftTimeline));
  };

  return (
    <div className="studio-workspace-grid">
      <div className="studio-editor-column">
        <Card>
          <CardHeader>
            <div className="studio-section-heading">
              <div>
                <CardTitle>Timeline editor</CardTitle>
                <p>Editing buffer preserves backend fields and saves through PUT /api/projects/:projectId/timeline.</p>
              </div>
              <div className="studio-action-row">
                <Button variant="secondary" onClick={() => setDraftTimeline(projectTimeline ? cloneTimelineForEditing(projectTimeline) : null)} disabled={!isDirty || isSaving}>
                  Reset
                </Button>
                <Button variant="primary" onClick={saveTimeline} isLoading={isSaving} disabled={!isDirty || hasBlockingIssues}>
                  Save timeline
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="ui-page-section">
            {isDirty ? (
              <Alert title="Unsaved timeline edits" tone="warning">
                Changes are local until saved. Browser and in-app navigation now ask for confirmation before discarding this edit buffer.
              </Alert>
            ) : (
              <Alert title="Timeline is synced" tone="success">
                The editing buffer matches the latest project detail response.
              </Alert>
            )}
            {hasBlockingIssues ? (
              <Alert title="Blocking edit issues" tone="danger">
                Save is disabled while required scene fields are empty or invalid. Backend validation is the final authority before render.
              </Alert>
            ) : null}
            <TimelineMetaEditor timeline={draftTimeline} onChange={setDraftTimeline} />
          </CardContent>
        </Card>

        <div className="scene-list">
          {draftTimeline.scenes.map((scene, sceneIndex) => (
            <SceneCard
              key={`${scene.index ?? sceneIndex}-${sceneIndex}`}
              scene={scene}
              index={sceneIndex}
              sceneCount={draftTimeline.scenes.length}
              onChange={(nextScene) => updateScene(sceneIndex, nextScene)}
              onMoveUp={() => setDraftTimeline({ ...draftTimeline, scenes: moveScene(draftTimeline.scenes, sceneIndex, sceneIndex - 1) })}
              onMoveDown={() => setDraftTimeline({ ...draftTimeline, scenes: moveScene(draftTimeline.scenes, sceneIndex, sceneIndex + 1) })}
              onDuplicate={() =>
                setDraftTimeline({
                  ...draftTimeline,
                  scenes: [...draftTimeline.scenes, duplicateScene(scene, draftTimeline.scenes.length + 1)],
                })
              }
              onRemove={() => setDraftTimeline({ ...draftTimeline, scenes: removeScene(draftTimeline.scenes, sceneIndex) })}
            />
          ))}
        </div>

        <Button variant="secondary" onClick={addScene}>Add scene</Button>
      </div>

      <aside className="studio-sidebar-column">
        <TimelineStatsPanel timeline={draftTimeline} />
        <RenderProjectPanel project={project} isTimelineDirty={isDirty} />
        <Card>
          <CardHeader>
            <CardTitle>Render boundary</CardTitle>
          </CardHeader>
          <CardContent className="ui-page-section">
            <Alert title="No fake asset picker" tone="info">
              visual_query is editable, but stock asset selection is not simulated because the backend does not expose asset-choice endpoints.
            </Alert>
            <Alert title="Saved timeline only" tone="warning">
              Render controls are disabled while local timeline edits are unsaved. Save first so backend validation and render use the canonical timeline.
            </Alert>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
