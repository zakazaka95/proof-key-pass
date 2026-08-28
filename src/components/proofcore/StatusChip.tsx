import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ChipTone = "success" | "warning" | "error" | "info" | "neutral";

const toneClasses: Record<ChipTone, string> = {
  success: "border-success text-success",
  warning: "border-warning text-warning",
  error: "border-destructive text-destructive",
  info: "border-primary text-primary",
  neutral: "border-border-strong text-muted-foreground",
};

interface StatusChipProps {
  tone?: ChipTone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function StatusChip({ tone = "neutral", children, icon, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em]",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
