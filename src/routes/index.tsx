import { createFileRoute, Link } from "@tanstack/react-router";
import { FileCheck2, GitPullRequest, IdCard, KeyRound, Lock, ScanLine, ShieldOff } from "lucide-react";

import { Disclaimer } from "@/components/proofcore/Disclaimer";
import { Logo } from "@/components/proofcore/Logo";
import { PageShell } from "@/components/proofcore/SiteChrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Proofcore — Prove the work. Keep the keys." },
      {
        name: "description",
        content:
          "Verify signed Technocore receipts locally and export a portable, verifiable agent contribution passport. No keys, no accounts, no tracking.",
      },
      { property: "og:title", content: "Proofcore — Prove the work. Keep the keys." },
      {
        property: "og:description",
        content:
          "Turn signed Technocore activity and open-source contributions into a portable, verifiable agent passport.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: ScanLine,
    title: "Verify a signed receipt",
    body: "Drop in a Technocore receipt. The Ed25519 signature over room|nonce|text is checked in your browser.",
  },
  {
    icon: GitPullRequest,
    title: "Attach public contributions",
    body: "Add public X, GitHub, repository, commit and pull-request links, and fetch live public PR status.",
  },
  {
    icon: IdCard,
    title: "Export your Agent Passport",
    body: "Download a 1200×630 PNG share card, a portable JSON bundle and a plain-text proof summary.",
  },
];

const PRIVACY = [
  { icon: KeyRound, title: "No private keys", body: "Proofcore never requests, receives, stores or generates a private key." },
  { icon: ShieldOff, title: "No accounts", body: "No login, no database, no cookies, no analytics, no tracking." },
  { icon: Lock, title: "Local verification", body: "Signature checking and card rendering run entirely client-side." },
  { icon: FileCheck2, title: "No eligibility promises", body: "Evidence only. Proofcore never scores or ranks you." },
];

function Landing() {
  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-border">
        <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <span className="label-caps inline-flex items-center gap-2 border border-border px-2.5 py-1">
            <Logo className="h-3.5 w-3.5 text-primary" title="" /> Independent community tool
          </span>
          <h1 className="mt-6 font-display text-4xl leading-[1.05] font-bold sm:text-6xl">
            Prove the work.
            <br />
            Keep the keys.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Turn signed Technocore activity and open-source contributions into a
            portable, verifiable agent passport.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/verify"
              className="inline-flex items-center justify-center bg-primary px-6 py-3 font-mono text-xs uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90"
            >
              Verify a receipt
            </Link>
            <Link
              to="/passport"
              search={{ demo: true }}
              className="inline-flex items-center justify-center border border-border-strong px-6 py-3 font-mono text-xs uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              View demo passport
            </Link>
          </div>

          <Disclaimer className="mt-10 max-w-3xl" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="label-caps">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <article key={step.title} className="panel p-5">
              <div className="flex items-center justify-between">
                <step.icon className="size-5 text-primary" aria-hidden="true" />
                <span className="font-mono text-xs text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="label-caps">Privacy posture</h2>
        <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {PRIVACY.map((item) => (
            <div key={item.title} className="bg-surface p-5">
              <item.icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-display text-base font-bold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          Proofcore is an independent open-source community tool. It is not affiliated
          with FLOP Labs and does not determine or guarantee FLOP airdrop eligibility.{" "}
          <Link to="/trust" className="text-primary underline underline-offset-4">
            Read the trust model
          </Link>
          .
        </p>
      </section>
    </PageShell>
  );
}
