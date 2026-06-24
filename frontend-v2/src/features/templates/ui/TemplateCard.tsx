import type { Template } from "@entities/template/model";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/ui";
import { formatDurationSeconds, humanizeIdentifier } from "@shared/lib";

type TemplateCardProps = {
  template: Template;
  isSelected: boolean;
  onSelect: (template: Template) => void;
};

export function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      className="template-card-button"
      aria-pressed={isSelected}
      onClick={() => onSelect(template)}
    >
      <Card className={isSelected ? "template-card template-card-selected" : "template-card"}>
        <CardHeader className="template-card-header">
          <div className="template-card-title-row">
            <CardTitle>{template.name}</CardTitle>
            <Badge tone={isSelected ? "accent" : "neutral"}>{isSelected ? "Selected" : humanizeIdentifier(template.id)}</Badge>
          </div>
          <CardDescription>{template.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="template-meta-grid">
            <div>
              <dt>Scenes</dt>
              <dd>{template.scene_count}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{formatDurationSeconds(template.recommended_duration)}</dd>
            </div>
            <div>
              <dt>Tone</dt>
              <dd>{humanizeIdentifier(template.tone)}</dd>
            </div>
            <div>
              <dt>Captions</dt>
              <dd>{humanizeIdentifier(template.caption_style)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </button>
  );
}
