import type { Template, TemplateId } from "@entities/template/model";
import { Skeleton } from "@shared/ui";
import { TemplateCard } from "./TemplateCard";

type TemplateGridProps = {
  templates: Template[];
  selectedTemplateId: TemplateId;
  onSelectTemplate: (template: Template) => void;
  isLoading?: boolean;
};

export function TemplateGrid({ templates, selectedTemplateId, onSelectTemplate, isLoading = false }: TemplateGridProps) {
  if (isLoading) {
    return (
      <div className="template-grid" aria-label="Loading templates">
        <Skeleton style={{ height: 236 }} />
        <Skeleton style={{ height: 236 }} />
        <Skeleton style={{ height: 236 }} />
      </div>
    );
  }

  return (
    <div className="template-grid">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={template.id === selectedTemplateId}
          onSelect={onSelectTemplate}
        />
      ))}
    </div>
  );
}
