# 01 · Requirements

**Credora** — an open platform where any organisation (company, university, department, club) can issue
tamper-proof digital credentials to anyone, and anyone can verify them instantly.

## 1. Problem

- Paper / PDF certificates are trivially forged (Photoshop).
- Verifying a certificate today means emailing HR / the registrar and waiting days.
- Small issuers (college clubs, meetups, NGOs) have no affordable way to issue verifiable certificates.
- A person's achievements are scattered across emails, drives and portals.

## 2. Goals

| # | Goal |
|---|------|
| G1 | Verification of any credential in < 5 seconds via link / QR / ID |
| G2 | Any org — including nested sub-orgs — can issue any type of credential |
| G3 | Each person has a single unique identity + profile of all credentials |
| G4 | Holder controls visibility of each credential and the whole profile |
| G5 | Credentials remain verifiable even if the platform is offline (cryptographic signatures) |
| G6 | Run on free-tier infrastructure |

## 3. Actors

| Actor | Description |
|-------|-------------|
| **Visitor / Verifier** | Anyone (recruiter, admission officer). No login needed. |
| **Holder (User)** | Person who receives credentials and owns a profile. |
| **Org Admin** | Manages org settings, members, sub-orgs, domain verification. |
| **Issuer** | Member allowed to create templates and issue / revoke credentials. |
| **Signatory** | Member whose name + title appears as the authoriser (e.g. *Dean*, *HR Head*). |

A single user may hold several roles in several orgs.

## 4. Functional requirements

### 4.1 Identity
- FR-1 Register with name, email, password. System assigns an immutable public **handle** (e.g. `K7Q2XM9P`).
- FR-2 Email verification. Credentials sent to an email are auto-claimed only after that email is verified.
- FR-3 Login / logout with secure session cookies.
- FR-4 Profile: name, bio, profile visibility (`PUBLIC` / `PRIVATE`).

### 4.2 Organisations
- FR-5 Any verified user can create an org; creator becomes `ADMIN + ISSUER + SIGNATORY`.
- FR-6 An org admin can create **sub-orgs** (unlimited depth: University → Dept → Club).
- FR-7 Domain verification via DNS TXT record → *Verified* badge. Sub-orgs inherit trust from a verified ancestor.
- FR-8 Admin can add members (by handle or email) and assign roles + display title.
- FR-9 Each org gets an Ed25519 signing key pair on creation; public key is published.

### 4.3 Templates
- FR-10 Issuer defines templates: name, type (`COURSE`, `EVENT`, `PARTICIPATION`, `ACHIEVEMENT`,
  `EMPLOYMENT`, `INTERNSHIP`, `DEGREE`, `MEMBERSHIP`, `OTHER`), description, custom fields, accent colour, signatories.
- FR-11 Templates can be archived.

### 4.4 Issuance
- FR-12 Issue to one recipient (name + email) with field values, optional expiry.
- FR-13 Bulk issue from CSV (≤ 500 rows).
- FR-14 Each credential is canonicalised, hashed (SHA-256) and signed with the org key.
- FR-15 If the recipient already has a verified account with that email, link immediately; otherwise link on verification.
- FR-16 Issuer can revoke with a reason. Revocation is immediately visible on verification.

### 4.5 Holder
- FR-17 Dashboard listing all received credentials.
- FR-18 Per-credential visibility: `PUBLIC` (on profile), `UNLISTED` (link only), `PRIVATE` (only holder + issuer).
- FR-19 Share profile `/u/{handle}` and credential `/c/{id}` links.
- FR-20 Download credential as PDF (with QR) and as signed JSON.

### 4.6 Verification
- FR-21 Verify page shows: issuer (+ verified badge + org chain), recipient, data, signatories, status, signature check result.
- FR-22 Verify an exported JSON file offline / via API (`POST /api/verify`).
- FR-23 Public keys endpoint per org.

## 5. Non-functional requirements

| Category | Requirement |
|----------|-------------|
| Security | bcrypt password hashing; httpOnly + SameSite cookies; private keys AES-256-GCM encrypted at rest; authorisation checks on every mutation; input validation with Zod; login rate limiting |
| Privacy | Recipient email never published — only a salted hash inside the signed payload |
| Integrity | Signed payload is deterministic (canonical JSON); any DB tampering is detected on verify |
| Performance | Verify page p95 < 500 ms (single indexed lookup) |
| Availability | Stateless app on serverless; DB managed (Neon / Supabase) |
| Portability | Standard Postgres + Node; no vendor lock-in |
| Cost | ₹0 on free tiers for hobby scale |

## 6. Out of scope (v1) — roadmap

- Multi-step signatory approval workflow (signatories approve before issue)
- Email notification to recipients on issuance (batched via a queue)
- Key rotation UI (schema already supports `keyId`)
- W3C VC / Open Badges 3.0 JSON-LD export
- LinkedIn "Add to profile" button, webhooks, public issuing API keys
- Custom certificate designer with drag-and-drop
