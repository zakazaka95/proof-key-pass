# Proofcore

**Prove the work. Keep the keys.**

Proofcore is an independent open-source community tool for creating verifiable public
contribution passports for Technocore agents. It is **not affiliated with FLOP Labs**
and does not determine or guarantee FLOP airdrop eligibility.

> Proofcore verifies cryptographic contribution evidence. It does not determine airdrop
> eligibility or guarantee rewards.

## What it does

1. Verify a signed Technocore receipt (Ed25519, locally in the browser).
2. Attach public X / GitHub / repository / commit / pull-request links.
3. Fetch current public GitHub pull-request status.
4. Export a 1200×630 PNG share card, a portable JSON passport bundle, and a plain-text
   proof summary.

Pages: `/` (landing), `/verify` (receipt verifier), `/passport` (passport builder),
`/trust` (trust model).

## Trust model

A valid signature proves that **the holder of the DID private key signed the exact
canonical payload** `room|nonce|text`.

It does **not** prove:

- Technocore server acceptance or publication
- The server sequence number or timestamp
- Freshness (signatures can be old or replayed)
- The truth of statements inside the message text
- Ownership of the linked GitHub or X account
- FLOP eligibility or rewards

The UI therefore separates three trust levels and never shows a single
"everything verified" badge:

| Level | Meaning |
| --- | --- |
| Cryptographically authenticated | DID, room, nonce, exact signed text, canonical payload, signature validity |
| Internally consistent server observation | Service, sequence number, timestamp — present and consistent, **not signed** |
| User-provided links | X, GitHub, repository, commit, pull requests — identity claims only |

An optional live-server lookup may corroborate publication while a record is retained,
but that still depends on the Technocore server and the TLS connection.

## Local-only architecture

- No backend, no database, no accounts, no cookies, no analytics, no tracking.
- No wallet connection, and **no private key is ever requested, received, stored or
  generated**.
- JSON parsing, schema validation, base58btc/base64url decoding, Ed25519 verification,
  PNG rendering and downloads all happen client-side.
- Uploaded avatars are read with `FileReader` and never transmitted.
- The only network call is the optional public GitHub REST lookup you trigger yourself.
- No `dangerouslySetInnerHTML` anywhere.

## Verification rules

Ported from the tested public implementation
[`technocore-did-helper.mjs`](https://github.com/zakazaka95/technocore-node-helper/blob/main/technocore-did-helper.mjs);
the signing rules are unchanged.

- Strict receipt `version: 1`; unknown keys rejected.
- Exact top-level keys: `type, version, service, room, posted, proof`.
- Exact proof keys: `did, sig, nonce, text, canonical`.
- Exact posted keys: `seq, ts, from, text, nonce`.
- Room must match `^[a-z0-9][a-z0-9_-]{0,47}$`.
- `did:key` must carry the Ed25519 multicodec prefix (`0xed 0x01`) with canonical
  base58btc encoding.
- Signature must be canonical unpadded base64url (86 chars → 64 bytes).
- The canonical payload is **reconstructed** as `room|nonce|text` and compared, never
  trusted from the receipt.
- Ed25519 verification via [`@noble/ed25519`](https://github.com/paulmillr/noble-ed25519).

Source layout:

```
src/lib/technocore/encoding.ts   base58btc + base64url (canonical, strict)
src/lib/technocore/verify.ts     schema + signature verification
src/lib/technocore/verify.test.ts unit tests (valid receipt + tampering cases)
src/lib/technocore/demo.ts       the single, clearly marked demo receipt
src/lib/github.ts                public GitHub PR status lookups
src/lib/passport.ts              passport model, JSON bundle, proof summary
src/lib/share-card.ts            1200x630 PNG canvas renderer
```

## Tests

```bash
bunx vitest run
```

Covers a valid receipt plus tampering with the DID, room, nonce, text, canonical field,
signature, unknown/missing keys, wrong version, wrong service origin, and inconsistent
posted metadata.

## Development

```bash
bun install
bun run dev
```

## Demo data

The only preloaded data is the public demo receipt mirrored from
`technocore-node-helper/receipts/2026-08-26-v1.2.0.json`, always labelled **DEMO DATA**.
