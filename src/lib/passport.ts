import type { PullRequestStatus } from "./github";
import type { VerifiedReceipt } from "./technocore/verify";

export interface PassportInput {
  displayName: string;
  did: string;
  xHandle: string;
  githubUsername: string;
  description: string;
  repositoryUrl: string;
  pullRequestUrls: string[];
}

export interface PassportData {
  input: PassportInput;
  verification:
    | { status: "verified"; result: VerifiedReceipt }
    | { status: "invalid"; error: string }
    | { status: "none" };
  pullRequests: PullRequestStatus[];
  generatedAt: string;
  isDemo: boolean;
}

export function truncateDid(did: string, head = 22, tail = 8): string {
  if (did.length <= head + tail + 1) return did;
  return `${did.slice(0, head)}…${did.slice(-tail)}`;
}

export function contributionCount(data: PassportData): number {
  const prs = Math.max(data.pullRequests.length, data.input.pullRequestUrls.length);
  const repo = data.input.repositoryUrl.trim() ? 1 : 0;
  const receipt = data.verification.status === "verified" ? 1 : 0;
  return prs + repo + receipt;
}

export function buildPassportBundle(data: PassportData) {
  const { input, verification, pullRequests, generatedAt } = data;
  return {
    format: "proofcore-passport",
    formatVersion: 1,
    generator: "Proofcore (independent community tool)",
    disclaimer:
      "Proofcore verifies cryptographic contribution evidence. It does not determine airdrop eligibility or guarantee rewards.",
    generatedAt,
    isDemo: data.isDemo,
    identityClaims: {
      note: "User-provided. Not authenticated by the Ed25519 signature.",
      displayName: input.displayName,
      xHandle: input.xHandle,
      githubUsername: input.githubUsername,
      description: input.description,
      repositoryUrl: input.repositoryUrl,
    },
    cryptographicallyAuthenticated:
      verification.status === "verified"
        ? {
            signatureValid: true,
            ...verification.result.authenticated,
          }
        : { signatureValid: false, error: verification.status === "invalid" ? verification.error : "no receipt provided" },
    unverifiedServerObservation:
      verification.status === "verified"
        ? verification.result.unverifiedServerObservation
        : null,
    publicGithubStatus: pullRequests.map((pr) => ({
      url: pr.htmlUrl,
      repository: `${pr.ref.owner}/${pr.ref.repo}`,
      number: pr.ref.number,
      state: pr.state,
      title: pr.title ?? null,
      author: pr.author ?? null,
      updatedAt: pr.updatedAt ?? null,
      error: pr.error ?? null,
      note: "Public GitHub data. Does not prove the DID holder controls this account.",
    })),
  };
}

export function buildProofSummary(data: PassportData): string {
  const { input, verification, pullRequests } = data;
  const lines: string[] = [];
  lines.push(`Proofcore report — ${input.displayName || "Unnamed agent"}`);
  lines.push(`Generated locally: ${data.generatedAt}`);
  lines.push("");
  lines.push("[Cryptographically authenticated]");
  if (verification.status === "verified") {
    const a = verification.result.authenticated;
    lines.push(`Ed25519 signature: VALID`);
    lines.push(`DID: ${a.did}`);
    lines.push(`Room: ${a.room}`);
    lines.push(`Nonce: ${a.nonce}`);
    lines.push(`Signed payload: ${a.canonical}`);
    lines.push("");
    lines.push("[Unverified server observation]");
    const o = verification.result.unverifiedServerObservation;
    lines.push(`Service: ${o.service} (origin not authenticated)`);
    lines.push(`Seq: ${o.seq} (not authenticated)`);
    lines.push(`Timestamp: ${o.ts} (not authenticated)`);
  } else if (verification.status === "invalid") {
    lines.push(`Ed25519 signature: NOT VALID — ${verification.error}`);
  } else {
    lines.push("No receipt supplied.");
  }
  lines.push("");
  lines.push("[User-provided identity — not authenticated]");
  lines.push(`X: ${input.xHandle || "—"}`);
  lines.push(`GitHub: ${input.githubUsername || "—"}`);
  lines.push(`Repository: ${input.repositoryUrl || "—"}`);
  lines.push("");
  lines.push("[Public GitHub pull-request status]");
  if (pullRequests.length === 0) {
    lines.push("None provided.");
  } else {
    for (const pr of pullRequests) {
      lines.push(
        `- ${pr.ref.owner}/${pr.ref.repo}#${pr.ref.number} — ${pr.state.toUpperCase()}${
          pr.title ? ` — ${pr.title}` : ""
        }${pr.error ? ` (${pr.error})` : ""} — ${pr.htmlUrl}`,
      );
    }
  }
  lines.push("");
  lines.push(
    "Independent Proofcore report. Not affiliated with FLOP Labs. Proofcore verifies cryptographic contribution evidence. It does not determine airdrop eligibility or guarantee rewards.",
  );
  return lines.join("\n");
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "agent"
  );
}
