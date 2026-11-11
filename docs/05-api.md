# 05 · API Specification

Base URL: `{APP_URL}/api` · JSON in/out · Auth via `credora_session` httpOnly cookie.

Errors: `{"error": {"code": "...", "message": "...", "details"?: {...}}}`

## Auth

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/auth/register` | — | `{name, email, password}` | `201 {user}` + cookie |
| POST | `/auth/login` | — | `{email, password}` | `200 {user}` + cookie · `429` after 10 failed attempts / 15 min |
| POST | `/auth/logout` | — | — | `200` clears cookie |
| GET | `/auth/verify-email?token=` | — | — | `302 /dashboard?verified=1` |
| POST | `/auth/resend-verification` | user | — | `200` |

## Me

| Method | Path | Auth | Body |
|--------|------|------|------|
| GET | `/me` | user | — → `{user}` |
| PATCH | `/me` | user | `{name?, bio?, profileVisibility?}` |
| PATCH | `/me/credentials/{id}` | holder | `{visibility: PUBLIC\|UNLISTED\|PRIVATE}` |

## Organisations

| Method | Path | Role | Body |
|--------|------|------|------|
| POST | `/orgs` | verified user (ADMIN of parent if `parentSlug`) | `{name, slug, description?, website?, parentSlug?}` |
| GET | `/orgs/{slug}` | public | → org, trust, chain, children |
| PATCH | `/orgs/{slug}` | ADMIN | `{name?, description?, website?, domain?}` |
| POST | `/orgs/{slug}/domain/verify` | ADMIN | — → `{domainStatus}` |
| GET | `/orgs/{slug}/keys` | public | → `{keys: [{keyId, publicKey, active, createdAt}]}` |
| POST | `/orgs/{slug}/members` | ADMIN | `{identifier (handle or email), roles[], title?}` |
| PATCH | `/orgs/{slug}/members/{membershipId}` | ADMIN | `{roles?, title?}` |
| DELETE | `/orgs/{slug}/members/{membershipId}` | ADMIN | — |
| POST | `/orgs/{slug}/templates` | ISSUER | see below |
| PATCH | `/orgs/{slug}/templates/{id}` | ISSUER | `{archived}` |
| POST | `/orgs/{slug}/credentials` | ISSUER | see below |

### Create template
```json
{
  "name": "HackNight Winner",
  "type": "EVENT",
  "description": "Awarded to the winning team of HackNight 2026",
  "accentColor": "#4f46e5",
  "fields": [{ "key": "position", "label": "Position", "required": true }],
  "signatoryIds": ["<membershipId>"]
}
```

### Issue credentials (single or bulk ≤ 500)
```json
{
  "templateId": "clx…",
  "expiresAt": null,
  "recipients": [
    { "name": "Asha Rao", "email": "asha@example.com", "fields": { "position": "1st" } }
  ]
}
```
Response `201 {"issued": 1, "ids": ["7KQ2XM9PA3DF"]}`

## Credentials (public)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/credentials/{id}` | public* | Verification result + signed document. `?download=1` → attachment |
| GET | `/credentials/{id}/pdf` | public* | PDF with QR code |
| POST | `/credentials/{id}/revoke` | ISSUER of org | `{reason}` |
| POST | `/verify` | public | Body = exported `{payload, proof}` → verification result |

\* `PRIVATE` credentials return `404` unless requester is the holder or an issuer of the org.

### Verification result
```json
{
  "state": "VALID",
  "checks": { "signature": true, "hash": true, "notRevoked": true, "notExpired": true },
  "trust": { "verified": true, "via": "IIT Madras", "domain": "iitm.ac.in" },
  "payload": { "...": "..." },
  "proof": { "type": "Ed25519Signature", "keyId": "...", "hash": "...", "signature": "..." },
  "revokedAt": null,
  "revokedReason": null
}
```
`state` ∈ `VALID | REVOKED | EXPIRED | TAMPERED | UNKNOWN_KEY`
