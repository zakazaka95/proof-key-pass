import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { CopyButton } from "./CopyButton";
import { StatusChip } from "./StatusChip";
import type { VerificationResult } from "@/lib/technocore/verify";

export function Section({
  title,
  tone,
  caption,
  children,
}: {
  title: string;
  tone: "authenticated" | "observation" | "user";
  caption: string;
  children: ReactNode;
}) {
  const border =
    tone === "authenticated"
      ? "border-l-success"
      : tone === "observation"
        ? "border-l-warning"
        : "border-l-secondary";
  return (
    <section className={`panel border-l-4 ${border} p-4 sm:p-5`}>
      <h3 className="font-display text-base font-bold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{caption}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function Field({
  label,
  value,
  copyable = false,
  mono = true,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <span className="label-caps">{label}</span>
        {copyable ? <CopyButton value={value} /> : null}
      </div>
      <p
        className={`mt-1.5 break-all text-sm text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

export function VerificationReport({
  result,
  userLinks,
}: {
  result: VerificationResult;
  userLinks?: { label: string; value: string }[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {result.ok ? (
          <>
            <StatusChip tone="success" icon={<CheckCircle2 className="size-3" />}>
              Signature verified
            </StatusChip>
            <StatusChip tone="success" icon={<CheckCircle2 className="size-3" />}>
              Receipt structure valid
            </StatusChip>
            <StatusChip tone="warning" icon={<AlertTriangle className="size-3" />}>
              Server observation unverified
            </StatusChip>
          </>
        ) : (
          <StatusChip tone="error" icon={<XCircle className="size-3" />}>
            Verification failed
          </StatusChip>
        )}
        {userLinks && userLinks.length > 0 ? (
          <StatusChip tone="info" icon={<ShieldAlert className="size-3" />}>
            User-provided identity
          </StatusChip>
        ) : null}
      </div>

      {!result.ok ? (
        <div
          role="alert"
          className="panel border-l-4 border-l-destructive p-4 sm:p-5"
        >
          <h3 className="font-display text-base font-bold text-destructive">
            This receipt did not verify
          </h3>
          <p className="mt-2 font-mono text-sm break-words text-foreground">
            {result.error}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Any change to the DID, room, nonce, text, canonical payload or signature
            invalidates the proof. Re-export the receipt from your signing tool and
            try again.
          </p>
        </div>
      ) : (
        <>
          <Section
            title="Cryptographically authenticated"
            tone="authenticated"
            caption="Proven by the Ed25519 signature over the exact canonical payload room|nonce|text."
          >
            <Field label="DID" value={result.value.authenticated.did} copyable />
            <Field label="DID fingerprint" value={result.value.authenticated.fingerprint} />
            <Field label="Room" value={result.value.authenticated.room} />
            <Field label="Nonce" value={result.value.authenticated.nonce} />
            <Field label="Exact signed text" value={result.value.authenticated.text} />
            <Field
              label="Canonical payload"
              value={result.value.authenticated.canonical}
              copyable
            />
            <div className="flex items-center gap-2 border border-success bg-background p-3">
              <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
              <span className="font-mono text-sm text-success">
                Signature valid — verified locally in this browser
              </span>
            </div>
          </Section>

          <Section
            title="Internally consistent server observation"
            tone="observation"
            caption="Present in the receipt and consistent with the signed proof, but NOT covered by the signature."
          >
            <Field
              label="Service (origin not authenticated)"
              value={result.value.unverifiedServerObservation.service}
            />
            <Field
              label="Sequence number (not authenticated)"
              value={String(result.value.unverifiedServerObservation.seq)}
            />
            <Field
              label="Timestamp (not authenticated)"
              value={result.value.unverifiedServerObservation.ts}
            />
            <p className="border border-warning/60 p-3 text-sm leading-relaxed text-foreground">
              The Ed25519 signature does <strong>not</strong> authenticate the sequence
              number, the timestamp, the service origin, GitHub or X account ownership,
              any linked claim, or airdrop eligibility.
            </p>
          </Section>
        </>
      )}

      {userLinks && userLinks.length > 0 ? (
        <Section
          title="User-provided links"
          tone="user"
          caption="Supplied by whoever filled in this form. Proofcore does not verify ownership of these accounts."
        >
          {userLinks.map((link) => (
            <Field key={link.label} label={link.label} value={link.value} />
          ))}
        </Section>
      ) : null}
    </div>
  );
}
