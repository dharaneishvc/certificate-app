# 07 · Deployment (free tier)

## 1. Database — Neon (free)

1. Sign up at <https://neon.tech> → create project `credora`.
2. Copy the **pooled** connection string → `DATABASE_URL`
   (append `?sslmode=require&pgbouncer=true&connection_limit=1` for serverless).
3. From your machine (with the *direct* connection string):
   ```bash
   DATABASE_URL="<direct-url>" npx prisma migrate deploy
   DATABASE_URL="<direct-url>" npm run db:seed   # optional demo data
   ```

*Alternative:* Supabase → Project Settings → Database → connection string.

## 2. Email — Resend (optional)

1. <https://resend.com> → API key → `RESEND_API_KEY`.
2. `MAIL_FROM` = `Credora <onboarding@resend.dev>` (works without your own domain for testing).

Without `RESEND_API_KEY`, verification links are printed to the server log.

## 3. App — Vercel (free Hobby)

1. Push repo to GitHub.
2. <https://vercel.com/new> → import repo (framework auto-detected: Next.js).
3. Environment variables:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Neon pooled URL |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `MASTER_KEY` | `openssl rand -base64 32` |
| `APP_URL` | `https://<project>.vercel.app` |
| `RESEND_API_KEY` | optional |
| `MAIL_FROM` | optional |

4. Deploy. `postinstall` runs `prisma generate` automatically.

## 4. CI

`.github/workflows/ci.yml` runs on every push / PR: install → prisma generate → lint → typecheck → build.

## 5. Local development

```bash
cp .env.example .env          # fill values
# Postgres: Neon free DB, a local install, `docker compose up -d`,
# or `npx prisma dev` (zero-install local Postgres; append &pgbouncer=true&connection_limit=1 to its URL)
npm install
npx prisma migrate dev
npm run db:seed
npm run dev                   # http://localhost:3000
npm run test:smoke            # end-to-end checks against the running app (run on a fresh seed)
```
