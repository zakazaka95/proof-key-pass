import { AlertTriangle, CheckCircle2, ExternalLink, GitMerge, GitPullRequest, HelpCircle, XCircle } from "lucide-react";

import { CopyButton } from "./CopyButton";
import { Logo } from "./Logo";
import { StatusChip, type ChipTone } from "./StatusChip";
import type { PullRequestState } from "@/lib/github";
import { contributionCount, truncateDid, type PassportData } from "@/lib/passport";

const PR_TONE: Record<PullRequestState, ChipTone> = {
  open: "success",
  merged: "info",
  closed: "error",
  unavailable: "warning",
};

function PrIcon({ state }: { state: PullRequestState }) {
  if (state === "merged") return <GitMerge className="size-3" />;
  if (state === "unavailable") return <HelpCircle className="size-3" />;
  return <GitPullRequest className="size-3" />;
}

export function PassportCard({
  data,
  avatarUrl,
}: {
  data: PassportData;
  avatarUrl: string | null;
}) {
  const verification = data.verification;
  const counts = contributionCount(data);

  return (
    <article className="panel">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo className="h-4 w-4 text-primary" title="" />
          <span className="font-mono text-[11px] tracking-[0.16em] uppercase">
            Agent passport
          </span>
        </div>
        {data.isDemo ? (
          <StatusChip tone="warning">Demo data</StatusChip>
        ) : (
          <span className="label-caps">Local build</span>
        )}
      </header>

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <div className="size-24 shrink-0 border border-border bg-background">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Logo className="h-10 w-10 text-primary" title="" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold break-words">
            {data.input.displayName || "Unnamed agent"}
          </h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {[data.input.xHandle, data.input.githubUsername && `github/${data.input.githubUsername}`]
              .filter(Boolean)
              .join("   ") || "No handles provided"}
          </p>
          {data.input.description ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {data.input.description}
            </p>
          ) : null}

          {data.input.did ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="border border-border bg-background px-2 py-1 font-mono text-xs break-all">
                {truncateDid(data.input.did)}
              </code>
              <CopyButton value={data.input.did} label="Copy DID" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
        <div className="bg-surface p-4">
          <span className="label-caps">Signature status</span>
          <div className="mt-2">
            {verification.status === "verified" ? (
              <StatusChip tone="success" icon={<CheckCircle2 className="size-3" />}>
                Signature verified
              </StatusChip>
            ) : verification.status === "invalid" ? (
              <StatusChip tone="error" icon={<XCircle className="size-3" />}>
                Signature invalid
              </StatusChip>
            ) : (
              <StatusChip tone="warning" icon={<AlertTriangle className="size-3" />}>
                No receipt
              </StatusChip>
            )}
          </div>
          {verification.status === "invalid" ? (
            <p className="mt-2 font-mono text-xs break-words text-destructive">
              {verification.error}
            </p>
          ) : null}
        </div>

        <div className="bg-surface p-4">
          <span className="label-caps">Signed room / server seq</span>
          <p className="mt-2 font-mono text-sm break-all">
            {verification.status === "verified"
              ? `${verification.result.authenticated.room} · seq ${verification.result.unverifiedServerObservation.seq}`
              : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Room is signed. Sequence and timestamp are unverified server observations.
          </p>
        </div>

        <div className="bg-surface p-4">
          <span className="label-caps">Repository</span>
          <p className="mt-2 font-mono text-sm break-all">
            {data.input.repositoryUrl
              ? data.input.repositoryUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")
              : "—"}
          </p>
        </div>

        <div className="bg-surface p-4">
          <span className="label-caps">Contribution count</span>
          <p className="mt-2 font-display text-2xl font-bold">{counts}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Verified receipt + repository + linked pull requests.
          </p>
        </div>
      </div>

      <div className="border-t border-border p-4 sm:p-5">
        <span className="label-caps">Live public GitHub pull requests</span>
        {data.pullRequests.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No pull requests linked yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.pullRequests.map((pr) => (
              <li
                key={pr.htmlUrl}
                className="flex flex-col gap-2 border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">
                    {pr.ref.owner}/{pr.ref.repo}#{pr.ref.number}
                    {pr.author ? ` · @${pr.author}` : ""}
                  </p>
                  <p className="mt-0.5 text-sm break-words">
                    {pr.title ?? pr.error ?? "Status unavailable"}
                  </p>
                  {pr.updatedAt ? (
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      Updated {new Date(pr.updatedAt).toISOString().slice(0, 10)}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusChip tone={PR_TONE[pr.state]} icon={<PrIcon state={pr.state} />}>
                    {pr.state}
                  </StatusChip>
                  <a
                    href={pr.htmlUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    aria-label={`Open pull request ${pr.ref.number} on GitHub`}
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          GitHub status is public data fetched now. It does not prove the DID owner
          controls this GitHub account.
        </p>
      </div>

      <footer className="border-t border-border px-4 py-3">
        <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-foreground">
          Independent Proofcore report · verified locally {data.generatedAt}
        </p>
      </footer>
    </article>
  );
}
