import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Logo } from "./Logo";
import { DISCLAIMER_TEXT } from "./Disclaimer";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/verify", label: "Verify" },
  { to: "/passport", label: "Passport" },
  { to: "/trust", label: "Trust model" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <Logo className="h-7 w-7 text-primary" />
          <span className="font-display text-lg font-bold tracking-tight">
            Proofcore
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "border-primary text-primary" }}
              inactiveProps={{ className: "border-transparent text-muted-foreground" }}
              className="border-b-2 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center border border-border p-2 text-foreground md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <nav
          className="border-t border-border bg-surface md:hidden"
          aria-label="Mobile"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-primary" }}
              className="block border-b border-border px-5 py-4 font-mono text-xs uppercase tracking-[0.14em]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-bold">Proofcore</span>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Independent open-source community tool. Not affiliated with FLOP Labs.{" "}
          {DISCLAIMER_TEXT}
        </p>
        <p className="label-caps">
          No accounts · No cookies · No analytics · Local verification only
        </p>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
