import type { SelectHTMLAttributes } from "react";
import { cn } from "@shared/lib";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("ui-select", className)} {...props}>
      {children}
    </select>
  );
}
