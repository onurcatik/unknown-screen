import type { TimelineScene } from "@entities/timeline/model";
import { getSceneVisualQuery } from "@entities/timeline/model";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Field, Input, Select, Textarea, Badge, Alert } from "@shared/ui";
import { formatDurationSeconds } from "@shared/lib";
import { getSceneEditWarnings, MAX_SCENE_DURATION_SECONDS, MIN_SCENE_DURATION_SECONDS } from "../model";

interface SceneCardProps {
  scene: TimelineScene;
  index: number;
  sceneCount: number;
  onChange: (scene: TimelineScene) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function parseDuration(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return MIN_SCENE_DURATION_SECONDS;
  }
  return Math.max(MIN_SCENE_DURATION_SECONDS, Math.min(MAX_SCENE_DURATION_SECONDS, parsed));
}

export function SceneCard({ scene, index, sceneCount, onChange, onMoveUp, onMoveDown, onDuplicate, onRemove }: SceneCardProps) {
  const warnings = getSceneEditWarnings(scene);
  const duration = typeof scene.duration === "number" ? scene.duration : Number(scene.duration || 0);

  return (
    <Card className="scene-card">
      <CardHeader className="scene-card-header">
        <div className="scene-card-title-row">
          <div>
            <CardTitle>Scene {index + 1}</CardTitle>
            <CardDescription>
              Purpose: <strong>{scene.purpose || "not set"}</strong> · Duration: {formatDurationSeconds(duration)}
            </CardDescription>
          </div>
          <div className="scene-card-actions" aria-label={`Scene ${index + 1} actions`}>
            <Button size="sm" variant="ghost" onClick={onMoveUp} disabled={index === 0}>Up</Button>
            <Button size="sm" variant="ghost" onClick={onMoveDown} disabled={index === sceneCount - 1}>Down</Button>
            <Button size="sm" variant="secondary" onClick={onDuplicate}>Duplicate</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="scene-card-content">
        {warnings.length > 0 ? (
          <Alert title="Scene edit warnings" tone="warning">
            <ul className="studio-warning-list">
              {warnings.map((warning) => (
                <li key={`${warning.field}-${warning.message}`}>{warning.message}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        <div className="scene-field-grid">
          <Field label="Purpose">
            <Select
              value={String(scene.purpose ?? "value_point")}
              onChange={(event) => onChange({ ...scene, purpose: event.target.value })}
            >
              <option value="hook">Hook</option>
              <option value="value_point">Value point</option>
              <option value="proof">Proof</option>
              <option value="reveal">Reveal</option>
              <option value="cta">CTA</option>
            </Select>
          </Field>
          <Field label="Duration" hint={`${MIN_SCENE_DURATION_SECONDS}-${MAX_SCENE_DURATION_SECONDS}s, backend-safe range.`}>
            <Input
              type="number"
              min={MIN_SCENE_DURATION_SECONDS}
              max={MAX_SCENE_DURATION_SECONDS}
              step="1"
              value={Number.isFinite(duration) ? duration : MIN_SCENE_DURATION_SECONDS}
              onChange={(event) => onChange({ ...scene, duration: parseDuration(event.target.value) })}
            />
          </Field>
        </div>

        <Field label="Voiceover" hint="Transcript-first edit source. This text drives the narration content.">
          <Textarea
            value={String(scene.voiceover ?? "")}
            placeholder="Write the narration line for this scene."
            onChange={(event) => onChange({ ...scene, voiceover: event.target.value })}
          />
        </Field>

        <Field label="Caption" hint={`${String(scene.caption ?? "").length} characters. Keep short captions compact.`}>
          <Input
            value={String(scene.caption ?? "")}
            placeholder="On-screen caption"
            onChange={(event) => onChange({ ...scene, caption: event.target.value })}
          />
        </Field>

        <Field label="visual_query" hint="Canonical backend field. Do not rename to visualQuery when saving.">
          <Input
            value={getSceneVisualQuery(scene)}
            placeholder="Specific visual target for this scene"
            onChange={(event) => onChange({ ...scene, visual_query: event.target.value })}
          />
        </Field>

        <div className="scene-field-grid">
          <Field label="Transition">
            <Select
              value={String(scene.transition ?? "quick_cut")}
              onChange={(event) => onChange({ ...scene, transition: event.target.value })}
            >
              <option value="quick_cut">Quick cut</option>
              <option value="hard_cut">Hard cut</option>
              <option value="fade">Fade</option>
            </Select>
          </Field>
          <Field label="Visual type">
            <Input
              value={String(scene.visual_type ?? "")}
              placeholder="stock_video / image / fallback_color"
              onChange={(event) => onChange({ ...scene, visual_type: event.target.value })}
            />
          </Field>
        </div>
      </CardContent>
      <CardFooter className="scene-card-footer">
        <Badge tone={warnings.length ? "warning" : "success"}>{warnings.length ? `${warnings.length} warning${warnings.length > 1 ? "s" : ""}` : "Scene ready"}</Badge>
        <Button size="sm" variant="danger" onClick={onRemove} disabled={sceneCount <= 1}>Remove scene</Button>
      </CardFooter>
    </Card>
  );
}
