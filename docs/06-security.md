# 06 · Security Design

## Threat model (STRIDE)

| Threat | Example | Mitigation |
|--------|---------|------------|
| **Spoofing** – fake org | Someone creates "Google" | DNS TXT domain verification; unverified orgs clearly labelled; trust inherited only through hierarchy |
| **Spoofing** – account takeover | Credential stuffing | bcrypt (cost 12), login rate limit, generic error messages |
| **Spoofing** – claim others' credentials | Register with victim's email | Credentials auto-linked **only after email ownership is verified** |
| **Tampering** – edit certificate PDF/JSON | Change grade / name | Ed25519 signature over canonical payload; verify page renders the signed payload only |
| **Tampering** – DB edit | Attacker with DB write changes payload | Hash + signature mismatch → `TAMPERED` |
| **Repudiation** | Issuer denies issuing | Signed with org key + `AuditLog` (actor, time) |
| **Info disclosure** – recipient email | Scraping verify pages | Only salted SHA-256 email hash published; PRIVATE visibility |
| **Info disclosure** – private keys | DB leak | AES-256-GCM with `MASTER_KEY` held only in env |
| **DoS** | Huge bulk upload | 500-row cap, Zod length limits, body-size limits |
| **Elevation of privilege** | Issuer acting on other org | `requireRole(user, org, role)` on every mutation; IDs always scoped by org |

## OWASP Top 10 checklist

| OWASP | Control |
|-------|---------|
| A01 Broken access control | Central `permissions.ts`; every handler resolves org by slug then checks role; credential mutations check `credential.orgId` |
| A02 Cryptographic failures | Node `crypto` Ed25519 + AES-256-GCM; secrets from env; HTTPS-only cookies in prod |
| A03 Injection | Prisma parameterised queries; no raw SQL; React auto-escaping; PDF text sanitised |
| A04 Insecure design | Threat model above; signed payload immutable |
| A05 Misconfiguration | Security headers in `next.config.ts` (CSP, X-Frame-Options, nosniff, Referrer-Policy) |
| A06 Vulnerable components | Dependabot + `npm audit` in CI |
| A07 Auth failures | Rate limit, bcrypt, 7-day JWT (HS256) in httpOnly SameSite=Lax cookie |
| A08 Integrity failures | Lockfile committed, CI build |
| A09 Logging | `AuditLog` table for all privileged actions |
| A10 SSRF | Only outbound calls: DNS TXT lookup on admin-supplied domain (validated hostname regex) and Resend API |

## CSRF

Session cookie is `SameSite=Lax`, so cross-site `POST/PATCH/DELETE` requests do not carry it. All mutating
endpoints accept only `application/json` bodies (a cross-site HTML form cannot send JSON without CORS preflight).

## Secrets

| Variable | Purpose | Generate |
|----------|---------|----------|
| `SESSION_SECRET` | HS256 JWT signing | `openssl rand -base64 48` |
| `MASTER_KEY` | AES-256-GCM key for org private keys (32 bytes, base64) | `openssl rand -base64 32` |

Rotating `MASTER_KEY` requires re-encrypting all `OrgKey.encryptedPrivateKey` rows (script TODO).
