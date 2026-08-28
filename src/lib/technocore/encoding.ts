/**
 * Canonical encoders/decoders ported from technocore-did-helper.mjs
 * (https://github.com/zakazaka95/technocore-node-helper).
 * Browser-safe: no Node Buffer, no dependencies.
 */

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export class TechnocoreError extends Error {}

export function fail(message: string): never {
  throw new TechnocoreError(message);
}

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function base58btcEncode(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    fail("base58 input must be a non-empty byte array");
  }

  let leadingZeroes = 0;
  while (leadingZeroes < bytes.length && bytes[leadingZeroes] === 0) {
    leadingZeroes += 1;
  }

  let number = bytes.length ? BigInt(`0x${bytesToHex(bytes) || "0"}`) : 0n;
  let encoded = "";
  while (number > 0n) {
    const remainder = Number(number % 58n);
    encoded = BASE58_ALPHABET[remainder] + encoded;
    number /= 58n;
  }

  return "1".repeat(leadingZeroes) + encoded;
}

/** Strict, canonical base58btc decoder — round-trips to reject non-canonical input. */
export function base58btcDecode(text: string): Uint8Array {
  if (typeof text !== "string" || text.length === 0) {
    fail("base58 input must be a non-empty string");
  }

  let number = 0n;
  for (const character of text) {
    const value = BASE58_ALPHABET.indexOf(character);
    if (value < 0) fail("base58 input contains an invalid character");
    number = number * 58n + BigInt(value);
  }

  let decoded = new Uint8Array(0);
  if (number > 0n) {
    let hex = number.toString(16);
    if (hex.length % 2 !== 0) hex = `0${hex}`;
    decoded = new Uint8Array(hex.length / 2);
    for (let i = 0; i < decoded.length; i += 1) {
      decoded[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
  }

  let leadingZeroes = 0;
  while (leadingZeroes < text.length && text[leadingZeroes] === "1") {
    leadingZeroes += 1;
  }

  const result = new Uint8Array(leadingZeroes + decoded.length);
  result.set(decoded, leadingZeroes);

  if (base58btcEncode(result) !== text) {
    fail("base58 input is not canonical");
  }
  return result;
}

export function base64urlDecode(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) {
    fail("value is not unpadded base64url");
  }
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}
