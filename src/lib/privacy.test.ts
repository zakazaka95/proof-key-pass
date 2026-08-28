/**
 * Static privacy/security audit over the shipped source tree:
 * no private-key surface, and no upload path for receipts or avatars.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

const FILES = walk("src").map((path) => ({ path, code: readFileSync(path, "utf8") }));
const APP = FILES.filter(
  (f) => !/error-capture|lovable-error-reporting|error-page|routeTree\.gen/.test(f.path),
);

describe("no private-key surface", () => {
  it("never references private key, seed or mnemonic material", () => {
    const offenders = APP.filter((f) =>
      /privateKey|private_key|secretKey|secret_key|mnemonic|seedPhrase|signAsync|getPublicKeyAsync/.test(
        f.code,
      ),
    ).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("imports only verification primitives from @noble/ed25519", () => {
    const imports = APP.filter((f) => f.code.includes("@noble/ed25519"));
    expect(imports.length).toBeGreaterThan(0);
    for (const file of imports) {
      expect(file.code).toMatch(/import \{ verifyAsync \} from "@noble\/ed25519"/);
      expect(file.code).not.toMatch(/\bsign\b|utils\.randomPrivateKey/);
    }
  });

  it("has no private-key or wallet input field in the UI", () => {
    const ui = APP.filter((f) => f.path.endsWith(".tsx"));
    for (const file of ui) {
      expect(file.code).not.toMatch(/private key|privatekey|wallet|connect wallet|seed phrase/i);
      expect(file.code).not.toMatch(/type="password"/);
    }
  });
});

describe("receipt and avatar data never leave the browser", () => {
  it("the only network call target is the public GitHub REST API", () => {
    const callers = APP.filter((f) => /\bfetch\(|XMLHttpRequest|sendBeacon|navigator\.sendBeacon/.test(f.code));
    expect(callers.map((f) => f.path)).toEqual(["src/lib/github.ts"]);
    const github = callers[0]!.code;
    const urls = github.match(/https?:\/\/[^\s`"')]+/g) ?? [];
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/(api\.)?github\.com/);
    }
    expect(github).not.toMatch(/method:\s*"POST"/);
  });

  it("has no server functions, API routes or backend client", () => {
    const offenders = APP.filter((f) =>
      /createServerFn|@\/integrations\/supabase|supabase|routes\/api\//.test(f.code),
    ).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("avatars are read locally with FileReader only", () => {
    const avatar = APP.find((f) => f.code.includes("FileReader"))!;
    expect(avatar.path).toBe("src/routes/passport.tsx");
    expect(avatar.code).toMatch(/readAsDataURL/);
    expect(avatar.code).not.toMatch(/FormData|upload/i);
  });

  it("does not persist receipts to storage or cookies", () => {
    const offenders = APP.filter((f) =>
      /localStorage|sessionStorage|indexedDB|document\.cookie/.test(f.code),
    ).map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});
