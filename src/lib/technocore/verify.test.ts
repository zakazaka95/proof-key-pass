import { describe, expect, it } from "vitest";

import { DEMO_RECEIPT } from "./demo";
import { verifyReceiptSafe, publicKeyFromDid } from "./verify";
import { base58btcDecode, base64urlDecode } from "./encoding";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Receipt = any;

const clone = (): Receipt => JSON.parse(JSON.stringify(DEMO_RECEIPT)) as Receipt;

const expectFailure = async (receipt: unknown, match: RegExp) => {
  const result = await verifyReceiptSafe(receipt);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toMatch(match);
};

describe("verifyReceipt — valid receipt", () => {
  it("accepts the untouched demo receipt", async () => {
    const result = await verifyReceiptSafe(DEMO_RECEIPT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.signatureValid).toBe(true);
      expect(result.value.authenticated.room).toBe("technocore");
      expect(result.value.authenticated.canonical).toBe(
        `technocore|${DEMO_RECEIPT.proof.nonce}|${DEMO_RECEIPT.proof.text}`,
      );
      expect(result.value.unverifiedServerObservation.seq).toBe(441322);
    }
  });
});

describe("verifyReceipt — tampering cases", () => {
  it("rejects a changed DID", async () => {
    const r = clone();
    (r.proof as Receipt).did =
      "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK";
    (r.posted as Receipt).from = (r.proof as Receipt).did;
    await expectFailure(r, /signature verification failed/);
  });

  it("rejects a changed room", async () => {
    const r = clone();
    r.room = "othercore";
    await expectFailure(r, /canonical payload does not match/);
  });

  it("rejects an invalid room format", async () => {
    const r = clone();
    r.room = "Technocore!";
    await expectFailure(r, /room must match/);
  });

  it("rejects a changed nonce", async () => {
    const r = clone();
    (r.proof as Receipt).nonce = "1787770791170074601";
    await expectFailure(r, /canonical payload does not match/);
  });

  it("rejects changed text", async () => {
    const r = clone();
    (r.proof as Receipt).text = `${(r.proof as Receipt).text} extra`;
    await expectFailure(r, /canonical payload does not match/);
  });

  it("rejects text and canonical changed together", async () => {
    const r = clone();
    const proof = r.proof as Receipt;
    proof.text = `${proof.text as string} extra`;
    proof.canonical = `${r.room as string}|${proof.nonce as string}|${proof.text as string}`;
    (r.posted as Receipt).text = proof.text;
    await expectFailure(r, /signature verification failed/);
  });

  it("rejects a changed signature", async () => {
    const r = clone();
    const proof = r.proof as Receipt;
    const sig = proof.sig as string;
    proof.sig = `${sig.slice(0, 85)}${sig[85] === "A" ? "B" : "A"}`;
    await expectFailure(r, /signature verification failed/);
  });

  it("rejects a non-base64url signature", async () => {
    const r = clone();
    (r.proof as Receipt).sig = "not*a*signature";
    await expectFailure(r, /canonical unpadded base64url/);
  });

  it("rejects a tampered canonical field", async () => {
    const r = clone();
    (r.proof as Receipt).canonical = "technocore|1|hello";
    await expectFailure(r, /canonical payload does not match/);
  });

  it("rejects unknown top-level keys", async () => {
    const r = clone();
    r.eligibility = "guaranteed";
    await expectFailure(r, /receipt contains missing or unsupported fields/);
  });

  it("rejects unknown proof keys", async () => {
    const r = clone();
    (r.proof as Receipt).extra = true;
    await expectFailure(r, /proof contains missing or unsupported fields/);
  });

  it("rejects missing posted keys", async () => {
    const r = clone();
    delete (r.posted as Receipt).seq;
    await expectFailure(r, /posted contains missing or unsupported fields/);
  });

  it("rejects a wrong receipt version", async () => {
    const r = clone();
    r.version = 2;
    await expectFailure(r, /unsupported Technocore receipt type or version/);
  });

  it("rejects a wrong service origin", async () => {
    const r = clone();
    r.service = "https://evil.example";
    await expectFailure(r, /receipt service must be/);
  });

  it("rejects posted metadata inconsistent with the proof", async () => {
    const r = clone();
    (r.posted as Receipt).from =
      "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK";
    await expectFailure(r, /posted metadata is inconsistent/);
  });

  it("rejects a non-object receipt", async () => {
    await expectFailure("nope", /receipt must be a JSON object/);
    await expectFailure([], /receipt must be a JSON object/);
  });
});

describe("did:key parsing", () => {
  it("extracts a 32-byte Ed25519 key", () => {
    expect(publicKeyFromDid(DEMO_RECEIPT.proof.did).length).toBe(32);
  });

  it("rejects a non-Ed25519 did:key", () => {
    expect(() => publicKeyFromDid("did:key:zQ3shokFTS3brHcDQrn82RUDfCZESWL1")).toThrow();
  });

  it("rejects non-canonical base58", () => {
    expect(() => base58btcDecode("0OIl")).toThrow();
  });

  it("decodes the demo signature to 64 bytes", () => {
    expect(base64urlDecode(DEMO_RECEIPT.proof.sig).length).toBe(64);
  });
});
