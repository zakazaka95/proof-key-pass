import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Disclaimer } from "@/components/proofcore/Disclaimer";
import { PageShell } from "@/components/proofcore/SiteChrome";
import { ReceiptInput } from "@/components/proofcore/ReceiptInput";
import { VerificationReport } from "@/components/proofcore/VerificationReport";
import { verifyReceiptSafe, type VerificationResult } from "@/lib/technocore/verify";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify a Technocore receipt | Proofcore" },
      {
        name: "description",
        content:
          "Check the Ed25519 signature of a Technocore receipt locally in your browser, with authenticated data clearly separated from unverified server observations.",
      },
      { property: "og:title", content: "Verify a Technocore receipt | Proofcore" },
      {
        property: "og:description",
        content:
          "Local, offline-capable Ed25519 receipt verification with precise trust levels — no keys, no accounts, no uploads.",
      },
      { property: "og:url", content: "https://getproofcore.xyz/verify" },
    ],
    links: [{ rel: "canonical", href: "https://getproofcore.xyz/verify" }],
  }),
  component: VerifyPage,
});

const LINK_FIELDS = [
  { key: "x", label: "X profile or post", placeholder: "https://x.com/handle" },
  { key: "github", label: "GitHub account", placeholder: "https://github.com/username" },
  {
    key: "repo",
    label: "Repository",
    placeholder: "https://github.com/owner/repo",
  },
  {
    key: "commit",
    label: "Commit",
    placeholder: "https://github.com/owner/repo/commit/sha",
  },
  {
    key: "prs",
    label: "Pull requests (one per line)",
    placeholder: "https://github.com/owner/repo/pull/1",
  },
] as const;

type LinkKey = (typeof LINK_FIELDS)[number]["key"];

function VerifyPage() {
  const [json, setJson] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [links, setLinks] = useState<Record<LinkKey, string>>({
    x: "",
    github: "",
    repo: "",
    commit: "",
    prs: "",
  });

  useEffect(() => {
    const text = json.trim();
    if (!text) {
      setResult(null);
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const timer = window.setTimeout(async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        if (!cancelled) {
          setResult({ ok: false, error: "input is not valid JSON", kind: "receipt" });
          setChecking(false);
        }
        return;
      }
      const outcome = await verifyReceiptSafe(parsed);
      if (!cancelled) {
        setResult(outcome);
        setChecking(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [json]);

  const userLinks = LINK_FIELDS.flatMap((field) => {
    const value = links[field.key].trim();
    return value ? [{ label: field.label, value }] : [];
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Receipt verifier</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Verification runs entirely in this browser tab. Nothing is uploaded and no private key is
          ever requested.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-6">
            <ReceiptInput
              value={json}
              onChange={setJson}
              onClear={() => {
                setJson("");
                setLinks({ x: "", github: "", repo: "", commit: "", prs: "" });
              }}
            />

            <section className="panel p-4 sm:p-5">
              <h2 className="font-display text-base font-bold">Optional public links</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These are user-provided claims. They are never authenticated by the signature.
              </p>
              <div className="mt-4 space-y-3">
                {LINK_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label htmlFor={`link-${field.key}`} className="label-caps block">
                      {field.label}
                    </label>
                    {field.key === "prs" ? (
                      <textarea
                        id={`link-${field.key}`}
                        rows={3}
                        value={links.prs}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          setLinks((prev) => ({ ...prev, prs: event.target.value }))
                        }
                        className="w-full border border-border bg-background p-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/70"
                      />
                    ) : (
                      <input
                        id={`link-${field.key}`}
                        type="url"
                        value={links[field.key]}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          setLinks((prev) => ({
                            ...prev,
                            [field.key]: event.target.value,
                          }))
                        }
                        className="w-full border border-border bg-background p-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/70"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            {checking ? (
              <div className="panel flex items-center gap-3 p-5">
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                <span className="font-mono text-sm text-muted-foreground">
                  Verifying signature locally…
                </span>
              </div>
            ) : result ? (
              <VerificationReport result={result} userLinks={userLinks} />
            ) : (
              <div className="panel p-6">
                <h2 className="font-display text-lg font-bold">No receipt loaded</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Drop a file, paste JSON, or load the demo receipt to see the three trust levels:
                  cryptographically authenticated data, internally consistent server observations,
                  and user-provided links.
                </p>
              </div>
            )}

            <Disclaimer />

            {result?.ok ? (
              <Link
                to="/passport"
                search={{ demo: false }}
                className="inline-flex items-center justify-center border border-primary px-5 py-3 font-mono text-xs uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Build an Agent Passport
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
