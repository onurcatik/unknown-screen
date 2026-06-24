import type { HTMLAttributes } from "react";
import { cn } from "@shared/lib";

export function PageSection({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("ui-page-section", className)} {...props} />;
}
