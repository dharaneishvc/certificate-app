# Credora

**Issue tamper-proof digital credentials from any organisation — verify them in seconds.**

Universities, departments, college clubs, companies and NGOs can issue certificates for courses, events,
internships, employment, degrees and more. Every credential is signed with the issuer's **Ed25519** key, so
anyone can verify it with a link, a QR code or the exported JSON, even without trusting the database.

![stack](https://img.shields.io/badge/Next.js-15-black) ![db](https://img.shields.io/badge/PostgreSQL-Prisma-blue)
![crypto](https://img.shields.io/badge/signatures-Ed25519-green) ![license](https://img.shields.io/badge/license-MIT-lightgrey)

## Features

- **One identity per person.** Each person gets a unique Credora ID (e.g. `PXEM382A`) and a shareable profile at `/u/{id}`.
- **Holders control visibility.** The whole profile can be public or private. Each credential can be **public**, **unlisted** (link only) or **private**.
- **Nested organisations.** University → Department → Club. Admins of a parent org can manage its sub-orgs.
- **Verified issuers.** An org proves it owns its domain with a DNS TXT record, and its sub-orgs inherit the verified badge.
- **Roles.** `ADMIN`, `ISSUER` and `SIGNATORY`. Each member also has a display title (e.g. *Dean*, *Head of HR*) that is printed on certificates.
- **Templates.** Any credential type, custom fields, accent colour, and a list of signatories.
- **Issuing.** Issue to one person, or bulk-issue up to 500 from a CSV file.
- **Signing.** Each credential is turned into canonical JSON, hashed with SHA-256, and signed with Ed25519. Private keys are encrypted with AES-256-GCM.
- **Verification page.** Shows whether the signature and hash checks pass, revocation and expiry status, the issuer's trust badge, and the issuing org chain. A verifier can type in an email to check it matches the recipient, without the email ever being shown.
- **PDF certificate** with a QR code, plus a **signed JSON export** that can be verified offline.
- **Revocation** with a reason, and an **audit log** of admin actions.
- Recipients who don't have an account yet are linked automatically once they sign up and verify their email.

## Design docs

| Doc | Contents |
|-----|----------|
| [01 – Requirements](docs/01-requirements.md) | Goals, actors, functional and non-functional requirements, roadmap |
| [02 – HLD](docs/02-hld.md) | Architecture, components, trust model, deployment diagram |
| [03 – LLD](docs/03-lld.md) | Module layout, class diagram, signed document format, sequence diagrams, permissions matrix, state machines |
| [04 – Database](docs/04-database.md) | ER diagram, tables, indexes, integrity rules |
| [05 – API](docs/05-api.md) | REST endpoints and request/response formats |
| [06 – Security](docs/06-security.md) | STRIDE threat model, OWASP Top 10 mapping |
| [07 – Deployment](docs/07-deployment.md) | Free hosting with Vercel, Neon and Resend |

## Tech stack

Next.js 15 (App Router, React 19) · TypeScript · Tailwind CSS 4 · Prisma 6 · PostgreSQL · Zod · jose (JWT) ·
bcryptjs · Node `crypto` (Ed25519 / AES-GCM) · pdf-lib · qrcode

```text
src/app/          pages + /api route handlers (thin)
src/server/       business logic: auth, org, template, credential, verification, permissions
src/lib/          crypto, canonical JSON, session, validation, PDF, mail, CSV
prisma/           schema, migrations, seed
docs/             HLD / LLD / DB / API / security / deployment
```

## Quick start

```bash
npm install
cp .env.example .env   # then set SESSION_SECRET and MASTER_KEY (commands are in the file)
```

Pick a Postgres:
- **Neon (free, cloud):** paste its connection string into `DATABASE_URL`.
- **Docker:** `docker compose up -d` (matches the default `DATABASE_URL`).
- **No install:** `npx prisma dev`, then use the URL it prints, with `&pgbouncer=true&connection_limit=1` added to the end.

Then:

```bash
npx prisma migrate dev
npm run db:seed        # demo users/orgs; password: password123
npm run dev            # http://localhost:3000
```

Demo logins (after seeding):

| Email | Role |
|-------|------|
| `priya@demo.dev` | Admin of *Demo Institute* → *Dept. of CSE* → *Coding Club* |
| `ravi@demo.dev` | Issuer and signatory at *Coding Club* |
| `meera@demo.dev` | Admin of *Acme Labs* (unverified company) |
| `asha@demo.dev` | Student who holds two credentials |

Without `RESEND_API_KEY`, email verification links are printed in the server console.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma |
| `npm run test:smoke` | End-to-end API checks against a running app with fresh seed data |

## Deploy for free

Vercel (app) + Neon (Postgres) + Resend (email). See [docs/07-deployment.md](docs/07-deployment.md).

## License

MIT
