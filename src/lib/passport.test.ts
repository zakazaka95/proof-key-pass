/**
 * Export audit: JSON passport bundle and plain-text proof summary are built from
 * a REAL verification result (no mocked success state).
 */
import { describe, expect, it } from "vitest";

import {
  buildPassportBundle,
  buildProofSummary,
  passportDisplayDid,
  slugify,
  type PassportData,
} from "./passport";
import { DEMO_PASSPORT, DEMO_RECEIPT } from "./technocore/demo";
import { verifyReceiptSafe } from "./technocore/verify";

async function verifiedData(): Promise<PassportData> {
  const outcome = await verifyReceiptSafe(DEMO_RECEIPT);
  if (!outcome.ok) throw new Error(`demo receipt failed real verification: ${outcome.error}`);
  return {
    input: {
      displayName: DEMO_PASSPORT.displayName,
      did: DEMO_PASSPORT.did,
      xHandle: DEMO_PASSPORT.xHandle,
      githubUsername: DEMO_PASSPORT.githubUsername,
      description: DEMO_PASSPORT.description,
      repositoryUrl: DEMO_PASSPORT.repositoryUrl,
      pullRequestUrls: DEMO_PASSPORT.pullRequestUrls,
    },
    verification: { status: "verified", result: outcome.value },
    pullRequests: [],
    githubFetchedAt: null,
    generatedAt: "2026-08-28T12:00:00Z",
    isDemo: true,
  };
}

describe("JSON passport export", () => {
  it("separates authenticated data from unverified server observation and claims", async () => {
    const bundle = buildPassportBundle(await verifiedData());
    expect(bundle.format).toBe("proofcore-passport");
    expect(bundle.formatVersion).toBe(2);
    expect(bundle.cryptographicallyAuthenticated.signatureValid).toBe(true);
    expect(bundle.unverifiedServerObservation?.seq).toBe(DEMO_RECEIPT.posted.seq);
    expect(bundle.identityClaims.note).toMatch(/Not authenticated/i);
    expect(bundle.identityClaims.publicDid).toBe(DEMO_PASSPORT.did);
    expect(bundle.disclaimer).toMatch(/does not determine airdrop eligibility/i);
  });

  it("serializes to valid JSON that contains no key material or avatar data", async () => {
    const text = JSON.stringify(buildPassportBundle(await verifiedData()), null, 2);
    expect(() => JSON.parse(text)).not.toThrow();
    expect(text).not.toMatch(/privateKey|private_key|secretKey|seed|mnemonic|data:image/i);
  });

  it("reports failure honestly when the signature is invalid", async () => {
    const data = await verifiedData();
    const bundle = buildPassportBundle({
      ...data,
      verification: {
        status: "invalid",
        error: "receipt signature verification failed",
        kind: "signature",
      },
    });
    expect(bundle.cryptographicallyAuthenticated.signatureValid).toBe(false);
    expect(bundle.unverifiedServerObservation).toBeNull();
  });

  it("does not call a schema failure an invalid signature", async () => {
    const data = await verifiedData();
    const bundle = buildPassportBundle({
      ...data,
      verification: {
        status: "invalid",
        error: "receipt contains missing or unsupported fields",
        kind: "receipt",
      },
    });
    expect(bundle.cryptographicallyAuthenticated.receiptValid).toBe(false);
    expect(bundle.cryptographicallyAuthenticated.signatureValid).toBeNull();
  });

  it("preserves linked PR URLs even before public status is fetched", async () => {
    const data = await verifiedData();
    const bundle = buildPassportBundle(data);
    expect(bundle.identityClaims.pullRequestUrls).toEqual(DEMO_PASSPORT.pullRequestUrls);
    expect(bundle.publicGithubStatus).toEqual([]);

    const summary = buildProofSummary(data);
    expect(summary).toContain(`Public DID claim: ${DEMO_PASSPORT.did}`);
    for (const url of DEMO_PASSPORT.pullRequestUrls) {
      expect(summary).toContain(url);
    }
    expect(summary).toContain("Not fetched. Linked URLs are listed above.");
  });

  it("includes enough sanitized material for independent verification", async () => {
    const bundle = buildPassportBundle(await verifiedData());
    expect(bundle.verificationMaterial).not.toBeNull();
    const outcome = await verifyReceiptSafe(bundle.verificationMaterial!.sourceReceipt);
    expect(outcome.ok).toBe(true);
  });

  it("uses the authenticated DID when a user-entered DID conflicts", async () => {
    const data = await verifiedData();
    data.input.did = "did:key:z6MkUserProvidedClaim";
    expect(passportDisplayDid(data)).toEqual({
      did: DEMO_RECEIPT.proof.did,
      authenticated: true,
      claimMismatch: true,
    });
    const bundle = buildPassportBundle(data);
    expect(bundle.identityClaims.publicDid).toBe("did:key:z6MkUserProvidedClaim");
    expect(bundle.cryptographicallyAuthenticated).toMatchObject({
      signatureValid: true,
      did: DEMO_RECEIPT.proof.did,
    });
  });
});

describe("plain-text proof summary export", () => {
  it("labels both trust tiers and never merges them", async () => {
    const text = buildProofSummary(await verifiedData());
    expect(text).toContain("[Cryptographically authenticated]");
    expect(text).toContain("Ed25519 signature: VALID");
    expect(text).toContain("[Unverified server observation]");
    expect(text).toMatch(/Seq: \d+ \(not authenticated\)/);
    expect(text).toMatch(/Timestamp: .+ \(not authenticated\)/);
    expect(text).toContain("[User-provided identity — not authenticated]");
    expect(text).toMatch(/does not determine airdrop eligibility/i);
  });

  it("does not claim validity without a receipt", async () => {
    const data = await verifiedData();
    const text = buildProofSummary({ ...data, verification: { status: "none" } });
    expect(text).toContain("No receipt supplied.");
    expect(text).not.toContain("VALID");
  });

  it("distinguishes a malformed receipt from a failed signature", async () => {
    const data = await verifiedData();
    const text = buildProofSummary({
      ...data,
      verification: {
        status: "invalid",
        error: "input is not valid JSON",
        kind: "receipt",
      },
    });
    expect(text).toContain("Receipt verification: FAILED");
    expect(text).toContain("Ed25519 signature: NOT ESTABLISHED");
    expect(text).not.toContain("Ed25519 signature: INVALID");
  });
});

describe("download filenames", () => {
  it("slugifies agent names safely", () => {
    expect(slugify("Zaksans PG!")).toBe("zaksans-pg");
    expect(slugify("")).toBe("agent");
  });
});
