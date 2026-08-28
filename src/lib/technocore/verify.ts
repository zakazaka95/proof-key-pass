/**
 * Local Ed25519 receipt verification.
 *
 * Ported 1:1 (signing rules unchanged) from the tested public implementation:
 * https://github.com/zakazaka95/technocore-node-helper/blob/main/technocore-did-helper.mjs
 *
 * Canonical signed payload: `room|nonce|text`
 * Never handles, requests or generates private keys.
 */
import { verifyAsync } from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha2.js";

import {
  base58btcDecode,
  base64urlDecode,
  base64urlEncode,
  bytesEqual,
  bytesToHex,
  fail,
  TechnocoreError,
  utf8,
} from "./encoding";

export const RECEIPT_TYPE = "technocore-signed-message-receipt";
export const RECEIPT_VERSION = 1;
export const RECEIPT_SERVICE = "https://technocore.chat";
export const ROOM_PATTERN = /^[a-z0-9][a-z0-9_-]{0,47}$/;

const ED25519_MULTICODEC = new Uint8Array([0xed, 0x01]);
const INVISIBLE_PATTERN = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}]/gu;

export interface TechnocoreReceipt {
  type: string;
  version: number;
  service: string;
  room: string;
  posted: { seq: number; ts: string; from: string; text: string; nonce: number };
  proof: {
    did: string;
    sig: string;
    nonce: string;
    text: string;
    canonical: string;
  };
}

export interface VerifiedReceipt {
  signatureValid: true;
  structureValid: true;
  /** Strict, sanitized receipt material needed for independent re-verification. */
  sourceReceipt: TechnocoreReceipt;
  authenticated: {
    did: string;
    fingerprint: string;
    room: string;
    nonce: string;
    text: string;
    canonical: string;
  };
  /** NOT authenticated by the Ed25519 signature. Internally consistent only. */
  unverifiedServerObservation: {
    service: string;
    seq: number;
    ts: string;
    internallyConsistent: true;
  };
}

export type VerificationFailureKind = "signature" | "receipt" | "internal";

export type VerificationResult =
  | { ok: true; value: VerifiedReceipt }
  | { ok: false; error: string; kind: VerificationFailureKind };

export function normalizeMessage(text: unknown): string {
  if (typeof text !== "string") fail("message text must be a string");
  const normalized = text.replace(INVISIBLE_PATTERN, " ").trim();
  if (!normalized) fail("message has no visible text after normalization");
  if ([...normalized].length > 4096) {
    fail("message must be no longer than 4096 characters");
  }
  return normalized;
}

export function validateRoom(room: unknown): string {
  if (typeof room !== "string" || !ROOM_PATTERN.test(room)) {
    fail("room must match ^[a-z0-9][a-z0-9_-]{0,47}$");
  }
  return room;
}

/** Extracts the raw Ed25519 public key from a did:key, validating the multicodec prefix. */
export function publicKeyFromDid(did: unknown): Uint8Array {
  if (typeof did !== "string" || !/^did:key:z6Mk[1-9A-HJ-NP-Za-km-z]{44}$/.test(did)) {
    fail("receipt DID must be an Ed25519 did:key");
  }
  const multibase = did.slice("did:key:".length);
  const decoded = base58btcDecode(multibase.slice(1));
  if (
    decoded.length !== ED25519_MULTICODEC.length + 32 ||
    !bytesEqual(decoded.subarray(0, ED25519_MULTICODEC.length), ED25519_MULTICODEC)
  ) {
    fail("receipt DID has an invalid Ed25519 multicodec payload");
  }
  return decoded.subarray(ED25519_MULTICODEC.length);
}

export function didFingerprint(did: string): string {
  publicKeyFromDid(did);
  return bytesToHex(sha256(utf8(did))).slice(0, 16);
}

function requireExactKeys(
  value: Record<string, unknown>,
  expectedKeys: string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${label} contains missing or unsupported fields`);
  }
}

function receiptNonceMatches(postedNonce: unknown, proofNonce: string): boolean {
  return (
    typeof postedNonce === "number" &&
    Number.isInteger(postedNonce) &&
    postedNonce >= 0 &&
    String(postedNonce) === proofNonce
  );
}

/** Throws TechnocoreError on any schema, canonicalisation or signature failure. */
export async function verifyReceipt(receipt: unknown): Promise<VerifiedReceipt> {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    fail("receipt must be a JSON object");
  }
  const value = receipt as Record<string, unknown>;
  requireExactKeys(value, ["type", "version", "service", "room", "posted", "proof"], "receipt");
  if (value["type"] !== RECEIPT_TYPE || value["version"] !== RECEIPT_VERSION) {
    fail("unsupported Technocore receipt type or version");
  }
  const service = value["service"];
  if (service !== RECEIPT_SERVICE) {
    fail(`receipt service must be ${RECEIPT_SERVICE}`);
  }

  const room = validateRoom(value["room"]);
  const proof = value["proof"] as Record<string, unknown>;
  const posted = value["posted"] as Record<string, unknown>;
  if (
    !proof ||
    typeof proof !== "object" ||
    Array.isArray(proof) ||
    !posted ||
    typeof posted !== "object" ||
    Array.isArray(posted)
  ) {
    fail("receipt must contain posted and proof objects");
  }
  requireExactKeys(proof, ["did", "sig", "nonce", "text", "canonical"], "proof");
  requireExactKeys(posted, ["seq", "ts", "from", "text", "nonce"], "posted");

  const proofNonce = proof["nonce"];
  if (typeof proofNonce !== "string" || !/^[0-9]{1,19}$/.test(proofNonce)) {
    fail("receipt nonce must contain 1-19 ASCII digits");
  }
  const proofText = proof["text"];
  if (typeof proofText !== "string") fail("receipt text must be a string");
  if (normalizeMessage(proofText) !== proofText) {
    fail("receipt text is not in canonical normalized form");
  }

  // Reconstruct the canonical payload instead of trusting the supplied field.
  const canonical = `${room}|${proofNonce}|${proofText}`;
  if (proof["canonical"] !== canonical) {
    fail("receipt canonical payload does not match its fields");
  }
  const sig = proof["sig"];
  if (typeof sig !== "string" || !/^[A-Za-z0-9_-]{86}$/.test(sig)) {
    fail("receipt signature must be canonical unpadded base64url");
  }

  const did = proof["did"];
  const publicKey = publicKeyFromDid(did);
  const signature = base64urlDecode(sig);
  if (
    signature.length !== 64 ||
    base64urlEncode(signature) !== sig ||
    !(await verifyAsync(signature, utf8(canonical), publicKey))
  ) {
    fail("receipt signature verification failed");
  }

  const seq = posted["seq"];
  const ts = posted["ts"];
  if (
    posted["from"] !== did ||
    posted["text"] !== proofText ||
    !receiptNonceMatches(posted["nonce"], proofNonce) ||
    !Number.isSafeInteger(seq) ||
    (seq as number) < 1 ||
    typeof ts !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(ts) ||
    !Number.isFinite(Date.parse(ts))
  ) {
    fail("posted metadata is inconsistent with the signed proof");
  }

  return {
    signatureValid: true,
    structureValid: true,
    sourceReceipt: {
      type: RECEIPT_TYPE,
      version: RECEIPT_VERSION,
      service: RECEIPT_SERVICE,
      room,
      posted: {
        seq: seq as number,
        ts,
        from: did as string,
        text: proofText,
        nonce: posted["nonce"] as number,
      },
      proof: {
        did: did as string,
        sig,
        nonce: proofNonce,
        text: proofText,
        canonical,
      },
    },
    authenticated: {
      did: did as string,
      fingerprint: didFingerprint(did as string),
      room,
      nonce: proofNonce,
      text: proofText,
      canonical,
    },
    unverifiedServerObservation: {
      service: service as string,
      seq: seq as number,
      ts,
      internallyConsistent: true,
    },
  };
}

/** Non-throwing wrapper for UI use. */
export async function verifyReceiptSafe(receipt: unknown): Promise<VerificationResult> {
  try {
    return { ok: true, value: await verifyReceipt(receipt) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown verification error";
    return {
      ok: false,
      error: message,
      kind:
        message === "receipt signature verification failed"
          ? "signature"
          : error instanceof TechnocoreError
            ? "receipt"
            : "internal",
    };
  }
}

export function parseReceiptJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    fail("input is not valid JSON");
  }
}
