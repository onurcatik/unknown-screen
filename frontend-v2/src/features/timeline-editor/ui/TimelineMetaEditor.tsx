import type { Timeline } from "@entities/timeline/model";
import { Field, Input, Textarea } from "@shared/ui";

interface TimelineMetaEditorProps {
  timeline: Timeline;
  onChange: (timeline: Timeline) => void;
}

export function TimelineMetaEditor({ timeline, onChange }: TimelineMetaEditorProps) {
  return (
    <div className="studio-meta-grid">
      <Field label="Hook" hint="High-level opening promise stored in the backend timeline JSON.">
        <Input
          value={timeline.hook ?? ""}
          placeholder="Hook line for the short"
          onChange={(event) => onChange({ ...timeline, hook: event.target.value })}
        />
      </Field>
      <Field label="Summary" hint="Short production note for this timeline.">
        <Textarea
          value={timeline.summary ?? ""}
          placeholder="Timeline summary"
          onChange={(event) => onChange({ ...timeline, summary: event.target.value })}
        />
      </Field>
    </div>
  );
}
