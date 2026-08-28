/**
 * Single-character mutation audit.
 * Every mutated receipt must FAIL real Ed25519 verification.
 * Nothing here is mocked: verifyReceiptSafe runs the real @noble/ed25519 code.
 */
import { describe, expect, it } from "vitest";

import { DEMO_RECEIPT } from "./demo";
import { verifyReceiptSafe } from "./verify";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Receipt = any;
const clone = (): Receipt => JSON.parse(JSON.stringify(DEMO_RECEIPT)) as Receipt;

/** Flips exactly one character of a string at the given index. */
function flipCharAt(value: string, index: number, alphabet: string): string {
  const current = value[index]!;
  const next = alphabet[(alphabet.indexOf(current) + 1) % alphabet.length]!;
  return value.slice(0, index) + (next === current ? alphabet[1]! : next) + value.slice(index + 1);
}

const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const DIGITS = "0123456789";
const ROOMCHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

describe("single-character mutations must fail verification", () => {
  it("baseline: the untouched demo receipt verifies with a real signature check", async () => {
    const result = await verifyReceiptSafe(DEMO_RECEIPT);
    expect(result.ok).toBe(true);
  });

  it("signature: one flipped base64url character", async () => {
    const r = clone();
    r.proof.sig = flipCharAt(r.proof.sig as string, 40, B64URL);
    expect(r.proof.sig).not.toBe(DEMO_RECEIPT.proof.sig);
    const result = await verifyReceiptSafe(r);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/signature verification failed/);
  });

  it("signed text: one flipped character (canonical + posted kept consistent)", async () => {
    const r = clone();
    const text = r.proof.text as string;
    const index = text.length - 1;
    r.proof.text = flipCharAt(text, index, "abcdefghijklmnopqrstuvwxyz");
    r.posted.text = r.proof.text;
    r.proof.canonical = `${r.room as string}|${r.proof.nonce as string}|${r.proof.text as string}`;
    const result = await verifyReceiptSafe(r);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/signature verification failed/);
  });

  it("nonce: one flipped digit (canonical + posted kept consistent)", async () => {
    const r = clone();
    r.proof.nonce = flipCharAt(r.proof.nonce as string, 5, DIGITS);
    r.posted.nonce = Number(r.proof.nonce);
    r.proof.canonical = `${r.room as string}|${r.proof.nonce as string}|${r.proof.text as string}`;
    const result = await verifyReceiptSafe(r);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(
        /signature verification failed|posted metadata is inconsistent/,
      );
    }
  });

  it("room: one flipped character (canonical kept consistent)", async () => {
    const r = clone();
    r.room = flipCharAt(r.room as string, 0, ROOMCHARS);
    r.proof.canonical = `${r.room as string}|${r.proof.nonce as string}|${r.proof.text as string}`;
    const result = await verifyReceiptSafe(r);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/signature verification failed/);
  });

  it("canonical payload: one flipped character with all other fields untouched", async () => {
    const r = clone();
    const canonical = r.proof.canonical as string;
    r.proof.canonical = flipCharAt(canonical, canonical.length - 1, "abcdefghijklmnopqrstuvwxyz");
    const result = await verifyReceiptSafe(r);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/canonical payload does not match/);
  });
});

describe("server observation fields are not covered by the signature", () => {
  it("a different seq still verifies and stays labeled unverified", async () => {
    const r = clone();
    r.posted.seq = (r.posted.seq as number) + 1;
    const result = await verifyReceiptSafe(r);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.signatureValid).toBe(true);
      expect(result.value.unverifiedServerObservation.seq).toBe(
        DEMO_RECEIPT.posted.seq + 1,
      );
      // seq/ts/service must never appear in the authenticated block
      expect(Object.keys(result.value.authenticated)).toEqual([
        "did",
        "fingerprint",
        "room",
        "nonce",
        "text",
        "canonical",
      ]);
    }
  });

  it("a different timestamp still verifies and stays labeled unverified", async () => {
    const r = clone();
    r.posted.ts = "2031-01-02T03:04:05Z";
    const result = await verifyReceiptSafe(r);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.unverifiedServerObservation.ts).toBe("2031-01-02T03:04:05Z");
      expect(result.value.unverifiedServerObservation.internallyConsistent).toBe(true);
      expect(result.value.authenticated).not.toHaveProperty("ts");
    }
  });
});
