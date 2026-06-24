import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@shared/lib";

type AlertTone = "info" | "success" | "warning" | "danger";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
}

export function Alert({ className, tone = "info", title, children, ...props }: AlertProps) {
  return (
    <div className={cn("ui-alert", `ui-alert-${tone}`, className)} role={tone === "danger" ? "alert" : "status"} {...props}>
      <div className="ui-alert-dot" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {children ? <div className="ui-alert-body">{children}</div> : null}
      </div>
    </div>
  );
}
