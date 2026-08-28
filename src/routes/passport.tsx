import { createFileRoute } from "@tanstack/react-router";
import { Download, FileJson, FileText, ImageDown, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Disclaimer } from "@/components/proofcore/Disclaimer";
import { PageShell } from "@/components/proofcore/SiteChrome";
import { PassportCard } from "@/components/proofcore/PassportCard";
import { ReceiptInput } from "@/components/proofcore/ReceiptInput";
import {
  fetchAllPullRequests,
  parsePullRequestUrl,
  type PullRequestStatus,
} from "@/lib/github";
import {
  buildPassportBundle,
  buildProofSummary,
  downloadBlob,
  slugify,
  type PassportData,
  type PassportInput,
} from "@/lib/passport";
import { renderShareCard } from "@/lib/share-card";
import { DEMO_PASSPORT, DEMO_RECEIPT_JSON } from "@/lib/technocore/demo";
import { verifyReceiptSafe } from "@/lib/technocore/verify";

export const Route = createFileRoute("/passport")({
  validateSearch: (search: Record<string, unknown>) => ({
    demo: search["demo"] === true || search["demo"] === "true",
  }),
  head: () => ({
    meta: [
      { title: "Build an Agent Passport | Proofcore" },
      {
        name: "description",
        content:
          "Combine a verified Technocore receipt with public GitHub contributions and export a 1200x630 PNG card, JSON bundle and plain-text proof summary.",
      },
      { property: "og:title", content: "Build an Agent Passport | Proofcore" },
      {
        property: "og:description",
        content:
          "Export a portable, verifiable agent contribution passport — generated entirely in your browser.",
      },
    ],
  }),
  component: PassportPage,
});

const EMPTY: PassportInput = {
  displayName: "",
  did: "",
  xHandle: "",
  githubUsername: "",
  description: "",
  repositoryUrl: "",
  pullRequestUrls: [],
};

function PassportPage() {
  const { demo } = Route.useSearch();

  const [input, setInput] = useState<PassportInput>(EMPTY);
  const [prText, setPrText] = useState("");
  const [receiptJson, setReceiptJson] = useState("");
  const [verification, setVerification] = useState<PassportData["verification"]>({
    status: "none",
  });
  const [pullRequests, setPullRequests] = useState<PullRequestStatus[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  const isDemo = demo;

  useEffect(() => {
    setGeneratedAt(new Date().toISOString().replace(".000", "").slice(0, 19) + "Z");
  }, [receiptJson, pullRequests, input]);

  const loadDemo = useCallback(() => {
    setInput({
      displayName: DEMO_PASSPORT.displayName,
      did: DEMO_PASSPORT.did,
      xHandle: DEMO_PASSPORT.xHandle,
      githubUsername: DEMO_PASSPORT.githubUsername,
      description: DEMO_PASSPORT.description,
      repositoryUrl: DEMO_PASSPORT.repositoryUrl,
      pullRequestUrls: DEMO_PASSPORT.pullRequestUrls,
    });
    setPrText(DEMO_PASSPORT.pullRequestUrls.join("\n"));
    setReceiptJson(DEMO_RECEIPT_JSON);
  }, []);

  useEffect(() => {
    if (demo) loadDemo();
  }, [demo, loadDemo]);

  // Local verification whenever the receipt text changes.
  useEffect(() => {
    const text = receiptJson.trim();
    if (!text) {
      setVerification({ status: "none" });
      return;
    }
    let cancelled = false;
    const run = async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        if (!cancelled) setVerification({ status: "invalid", error: "input is not valid JSON" });
        return;
      }
      const outcome = await verifyReceiptSafe(parsed);
      if (cancelled) return;
      setVerification(
        outcome.ok
          ? { status: "verified", result: outcome.value }
          : { status: "invalid", error: outcome.error },
      );
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [receiptJson]);

  const prRefs = useMemo(
    () =>
      prText
        .split(/\s+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map(parsePullRequestUrl)
        .filter((ref): ref is NonNullable<typeof ref> => ref !== null),
    [prText],
  );

  const invalidPrLines = useMemo(
    () =>
      prText
        .split(/\s+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => parsePullRequestUrl(line) === null),
    [prText],
  );

  const refreshPullRequests = async () => {
    if (prRefs.length === 0) {
      setPullRequests([]);
      setFetchNote("Add at least one GitHub pull-request URL first.");
      return;
    }
    setFetching(true);
    setFetchNote(null);
    const statuses = await fetchAllPullRequests(prRefs);
    setPullRequests(statuses);
    setInput((prev) => ({ ...prev, pullRequestUrls: prRefs.map((r) => r.url) }));
    const failed = statuses.filter((s) => s.state === "unavailable").length;
    setFetchNote(
      failed > 0
        ? `${statuses.length - failed} of ${statuses.length} fetched. ${failed} unavailable.`
        : `Fetched ${statuses.length} pull request${statuses.length === 1 ? "" : "s"}.`,
    );
    setFetching(false);
  };

  const data: PassportData = {
    input: { ...input, pullRequestUrls: prRefs.map((r) => r.url) },
    verification,
    pullRequests,
    generatedAt,
    isDemo,
  };

  const onAvatar = (file: File | undefined) => {
    setAvatarError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Please choose an image under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setAvatarError("That image could not be read locally.");
    reader.readAsDataURL(file);
  };

  const baseName = slugify(input.displayName || "agent");

  const downloadPng = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await renderShareCard(data, avatarUrl);
      downloadBlob(blob, `proofcore-${baseName}-card.png`);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Could not render the card.",
      );
    } finally {
      setExporting(false);
    }
  };

  const downloadJson = () => {
    downloadBlob(
      new Blob([JSON.stringify(buildPassportBundle(data), null, 2)], {
        type: "application/json",
      }),
      `proofcore-${baseName}-passport.json`,
    );
  };

  const downloadSummary = () => {
    downloadBlob(
      new Blob([buildProofSummary(data)], { type: "text/plain" }),
      `proofcore-${baseName}-summary.txt`,
    );
  };

  const field = (
    id: keyof PassportInput,
    label: string,
    placeholder: string,
    type: "input" | "textarea" = "input",
  ) => (
    <div className="space-y-1.5">
      <label htmlFor={`field-${id}`} className="label-caps block">
        {label}
      </label>
      {type === "textarea" ? (
        <textarea
          id={`field-${id}`}
          rows={3}
          value={String(input[id] ?? "")}
          placeholder={placeholder}
          onChange={(event) => setInput((prev) => ({ ...prev, [id]: event.target.value }))}
          className="w-full border border-border bg-surface p-2.5 text-sm text-foreground placeholder:text-muted-foreground/70"
        />
      ) : (
        <input
          id={`field-${id}`}
          value={String(input[id] ?? "")}
          placeholder={placeholder}
          onChange={(event) => setInput((prev) => ({ ...prev, [id]: event.target.value }))}
          className="w-full border border-border bg-surface p-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/70"
        />
      )}
    </div>
  );

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Passport builder</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Everything below is assembled locally. Avatars stay in this browser and are
          never transmitted.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-6">
            <section className="panel p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold">Agent details</h2>
                <button
                  type="button"
                  onClick={loadDemo}
                  className="border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  Load demo
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {field("displayName", "Display name", "Zaksans")}
                {field("did", "Public DID", "did:key:z6Mk…")}
                {field("xHandle", "X handle", "@handle")}
                {field("githubUsername", "GitHub username", "username")}
                {field("description", "Short agent description", "What you build", "textarea")}
                {field("repositoryUrl", "Repository URL", "https://github.com/owner/repo")}

                <div className="space-y-1.5">
                  <label htmlFor="pr-urls" className="label-caps block">
                    Commit or pull-request URLs (one per line)
                  </label>
                  <textarea
                    id="pr-urls"
                    rows={4}
                    value={prText}
                    spellCheck={false}
                    placeholder="https://github.com/owner/repo/pull/1"
                    onChange={(event) => setPrText(event.target.value)}
                    className="w-full border border-border bg-surface p-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/70"
                  />
                  {invalidPrLines.length > 0 ? (
                    <p className="text-xs text-warning">
                      {invalidPrLines.length} line
                      {invalidPrLines.length === 1 ? "" : "s"} are not GitHub pull-request
                      URLs and will be ignored.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <span className="label-caps block">Avatar (stays local)</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => avatarInput.current?.click()}
                      className="border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:border-primary hover:text-primary"
                    >
                      Choose image
                    </button>
                    {avatarUrl ? (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl(null)}
                        className="border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                      >
                        Remove
                      </button>
                    ) : null}
                    <input
                      ref={avatarInput}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      aria-label="Avatar image"
                      onChange={(event) => onAvatar(event.target.files?.[0])}
                    />
                  </div>
                  {avatarError ? (
                    <p role="alert" className="text-xs text-destructive">
                      {avatarError}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => void refreshPullRequests()}
                  disabled={fetching}
                  className="inline-flex w-full items-center justify-center gap-2 border border-primary px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
                >
                  {fetching ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  {fetching ? "Fetching GitHub status…" : "Fetch public GitHub status"}
                </button>
                {fetchNote ? (
                  <p aria-live="polite" className="text-xs text-muted-foreground">
                    {fetchNote}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="panel p-4 sm:p-5">
              <h2 className="font-display text-base font-bold">Technocore receipt</h2>
              <p className="mt-1 mb-4 text-sm text-muted-foreground">
                Optional, but required for a verified signature badge.
              </p>
              <ReceiptInput
                value={receiptJson}
                onChange={setReceiptJson}
                onClear={() => setReceiptJson("")}
              />
              {verification.status === "invalid" ? (
                <p role="alert" className="mt-3 font-mono text-xs break-words text-destructive">
                  {verification.error}
                </p>
              ) : null}
            </section>
          </div>

          <div className="space-y-4">
            <PassportCard data={data} avatarUrl={avatarUrl} />

            <section className="panel p-4 sm:p-5">
              <h2 className="font-display text-base font-bold">Export</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => void downloadPng()}
                  disabled={exporting}
                  className="inline-flex items-center justify-center gap-2 bg-primary px-3 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {exporting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ImageDown className="size-3.5" />
                  )}
                  PNG 1200×630
                </button>
                <button
                  type="button"
                  onClick={downloadJson}
                  className="inline-flex items-center justify-center gap-2 border border-border px-3 py-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:border-primary hover:text-primary"
                >
                  <FileJson className="size-3.5" /> JSON bundle
                </button>
                <button
                  type="button"
                  onClick={downloadSummary}
                  className="inline-flex items-center justify-center gap-2 border border-border px-3 py-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:border-primary hover:text-primary"
                >
                  <FileText className="size-3.5" /> Proof summary
                </button>
              </div>
              {exportError ? (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {exportError}
                </p>
              ) : null}
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Download className="size-3.5" aria-hidden="true" /> Files are generated
                in this browser tab.
              </p>
            </section>

            <Disclaimer />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
