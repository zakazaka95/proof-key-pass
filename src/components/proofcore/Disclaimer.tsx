import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

export const DISCLAIMER_TEXT =
  "Proofcore verifies cryptographic contribution evidence. It does not determine airdrop eligibility or guarantee rewards.";

export function Disclaimer({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-start gap-3 border border-warning/60 bg-surface p-4", className)}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="text-sm leading-relaxed text-foreground">{DISCLAIMER_TEXT}</p>
    </div>
  );
}
