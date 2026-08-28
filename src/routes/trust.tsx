import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";

import { Disclaimer } from "@/components/proofcore/Disclaimer";
import { PageShell } from "@/components/proofcore/SiteChrome";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust model — what a signature proves | Proofcore" },
      {
        name: "description",
        content:
          "Plain-language explanation of what a valid Ed25519 Technocore receipt signature proves, and the many things it does not prove.",
      },
      { property: "og:title", content: "Trust model — what a signature proves | Proofcore" },
      {
        property: "og:description",
        content:
          "A valid signature proves the DID key holder signed an exact payload. It does not prove publication, freshness, truth or account ownership.",
      },
      { property: "og:url", content: "https://getproofcore.xyz/trust" },
    ],
    links: [{ rel: "canonical", href: "https://getproofcore.xyz/trust" }],
  }),
  component: TrustPage,
});

const NOT_PROVEN = [
  "Technocore server acceptance or publication of the message",
  "The server sequence number or timestamp",
  "Freshness — a valid signature can be years old or replayed",
  "The truth of any statement written inside the message text",
  "Ownership of the linked GitHub or X account",
  "FLOP eligibility, rewards, ranking or standing of any kind",
];

function TrustPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Trust model</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Proofcore is deliberately narrow about what it claims. Below is exactly what a verified
          receipt does and does not establish.
        </p>

        <section className="panel mt-10 border-l-4 border-l-success p-5">
          <h2 className="font-display text-xl font-bold">What a valid signature proves</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            A valid signature proves that the holder of the DID private key signed the exact
            canonical payload <code className="font-mono text-primary">room|nonce|text</code>.
            Nothing about that payload can be altered without breaking the signature — change one
            character of the text, the room, the nonce or the signature itself and verification
            fails.
          </p>
          <ul className="mt-4 space-y-2">
            {[
              "The DID key holder produced this exact byte-for-byte payload",
              "The room, nonce and text shown are the signed ones",
              "The receipt structure matches the strict version 1 schema",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel mt-6 border-l-4 border-l-destructive p-5">
          <h2 className="font-display text-xl font-bold">What it does not independently prove</h2>
          <ul className="mt-4 space-y-2">
            {NOT_PROVEN.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel mt-6 border-l-4 border-l-warning p-5">
          <h2 className="font-display text-xl font-bold">Live server lookups</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            An optional live-server lookup may corroborate that a message was published while a
            record is retained. That corroboration is weaker than the signature: it depends on the
            Technocore server being online, honest and retaining the record, and on the TLS
            connection between your browser and that server. It is an observation, not a
            cryptographic proof. Proofcore does not currently perform this lookup.
          </p>
        </section>

        <section className="panel mt-6 border-l-4 border-l-secondary p-5">
          <h2 className="font-display text-xl font-bold">GitHub and X links</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            Pull-request status is read from GitHub&apos;s public REST API at the moment you press
            fetch. It shows the current public state of a public pull request. It never proves that
            the DID owner controls that GitHub or X account — those links are user-provided identity
            claims and are always labelled as such.
          </p>
        </section>

        <section className="panel mt-6 p-5">
          <h2 className="font-display text-xl font-bold">Architecture</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            Everything happens in your browser: JSON parsing, schema checks, base58btc and base64url
            decoding, Ed25519 verification, PNG card rendering and file downloads. Uploaded avatars
            are read locally and never transmitted. Proofcore has no application data API, database
            or accounts. The optional GitHub status lookup sends only public pull-request references
            to GitHub. Hosting and CDN infrastructure may set strictly necessary security cookies.
            Proofcore never requests, receives, stores or generates a private key, and there is no
            wallet connection anywhere in the product.
          </p>
        </section>

        <Disclaimer className="mt-8" />

        <p className="mt-8 text-sm text-muted-foreground">
          Ready?{" "}
          <Link to="/verify" className="text-primary underline underline-offset-4">
            Verify a receipt
          </Link>{" "}
          or{" "}
          <Link
            to="/passport"
            search={{ demo: false }}
            className="text-primary underline underline-offset-4"
          >
            build a passport
          </Link>
          .
        </p>
      </div>
    </PageShell>
  );
}
