import type { ReactNode } from "react";
import { Card, CardContent } from "../card";
import { Button } from "../button";

export interface EmptyStateProps {
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
}

export function EmptyState({ eyebrow, title, description, actionLabel, onAction, action }: EmptyStateProps) {
  return (
    <Card className="ui-empty-state">
      <CardContent>
        {eyebrow ? <span className="ui-empty-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        <p>{description}</p>
        {action ? action : actionLabel && onAction ? <Button variant="primary" onClick={onAction}>{actionLabel}</Button> : null}
      </CardContent>
    </Card>
  );
}
