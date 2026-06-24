import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@shared/lib";

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
}

export function Field({ className, label, htmlFor, hint, error, children, ...props }: FieldProps) {
  return (
    <div className={cn("ui-field", className)} {...props}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {error ? <p className="ui-field-error">{error}</p> : hint ? <p className="ui-field-hint">{hint}</p> : null}
    </div>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("ui-label", className)} {...props} />;
}
