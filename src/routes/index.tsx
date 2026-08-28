import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileCheck2,
  GitPullRequest,
  IdCard,
  KeyRound,
  Lock,
  ScanLine,
  ShieldOff,
} from "lucide-react";

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
          "Verify signed Technocore receipts locally and export a portable, verifiable agent contribution passport. No private keys, accounts or receipt uploads.",
      },
      { property: "og:title", content: "Proofcore — Prove the work. Keep the keys." },
      {
        property: "og:description",
        content:
          "Turn signed Technocore activity and open-source contributions into a portable, verifiable agent passport.",
      },
      { property: "og:url", content: "https://getproofcore.xyz/" },
    ],
    links: [{ rel: "canonical", href: "https://getproofcore.xyz/" }],
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
    body: "Add public X, GitHub and repository links, plus pull requests with current public status.",
  },
  {
    icon: IdCard,
    title: "Export your Agent Passport",
    body: "Download a 1200×630 PNG share card, a portable JSON bundle and a plain-text proof summary.",
  },
];

const PRIVACY = [
  {
    icon: KeyRound,
    title: "No private keys",
    body: "Proofcore never requests, receives, stores or generates a private key.",
  },
  {
    icon: ShieldOff,
    title: "No accounts",
    body: "No Proofcore login or database. Hosting infrastructure may use strictly necessary security cookies.",
  },
  {
    icon: Lock,
    title: "Local verification",
    body: "Signature checking and card rendering run entirely client-side.",
  },
  {
    icon: FileCheck2,
    title: "No eligibility promises",
    body: "Evidence only. Proofcore never scores or ranks you.",
  },
];

function Landing() {
  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-border">
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-32">
          <div
            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 opacity-20 sm:opacity-25"
            aria-hidden="true"
          >
            <div className="h-72 w-72 rounded-full border border-primary sm:h-96 sm:w-96" />
            <div className="absolute inset-8 rounded-full border border-secondary sm:inset-12" />
          </div>

          <span className="label-caps inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
            <Logo className="h-3.5 w-3.5 text-primary" title="" /> Independent community tool
          </span>

          <h1 className="relative mt-8 font-display text-5xl leading-[1.05] font-bold tracking-tight sm:text-7xl">
            Prove the work.
            <br />
            Keep the keys.
          </h1>
          <p className="relative mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Turn signed Technocore activity and open-source contributions into a portable,
            verifiable agent passport.
          </p>

          <div className="relative mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/verify"
              className="inline-flex items-center justify-center rounded-md bg-primary px-7 py-3.5 font-mono text-xs uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90"
            >
              Verify a receipt
            </Link>
            <Link
              to="/passport"
              search={{ demo: true }}
              className="inline-flex items-center justify-center rounded-md border border-border-strong bg-surface px-7 py-3.5 font-mono text-xs uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              View demo passport
            </Link>
          </div>

          <Disclaimer className="relative mt-12 max-w-3xl" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="label-caps">How it works</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <article
              key={step.title}
              className="panel-raised p-6 transition-colors hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center justify-center rounded-md border border-border bg-background p-2.5">
                  <step.icon className="size-5 text-primary" aria-hidden="true" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <h2 className="label-caps">Privacy posture</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRIVACY.map((item) => (
            <div key={item.title} className="panel p-5 transition-colors hover:border-primary">
              <div className="inline-flex items-center justify-center rounded-md border border-border bg-background p-2">
                <item.icon className="size-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-base leading-relaxed text-muted-foreground">
          Proofcore is an independent open-source community tool. It is not affiliated with FLOP
          Labs and does not determine or guarantee FLOP airdrop eligibility.{" "}
          <Link to="/trust" className="text-primary underline underline-offset-4">
            Read the trust model
          </Link>
          .
        </p>
      </section>
    </PageShell>
  );
}
