# Production runbook

## Required configuration

Set every variable documented in `.env.example`. Production startup fails closed
when `DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET`, or `TOKEN_ENCRYPTION_KEY` is
missing or malformed. Use independent random values for each secret; never copy
development values into production.

OAuth callback URLs must exactly match the production routes registered with
Google, Meta, and TikTok. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin.

## Database deployment

Back up the database before every schema deployment, then run:

```bash
npx prisma migrate deploy
```

This repository now contains a baseline migration. For an existing database that
was previously managed with `prisma db push`, inspect it against
`prisma/migrations/20260930220000_baseline/migration.sql`, back it up, and mark the
baseline as applied exactly once before the first migration-based deployment:

```bash
npx prisma migrate resolve --applied 20260930220000_baseline
```

Do not run `prisma db push` against production. Roll back application code first;
database rollbacks require a reviewed forward migration and a verified backup.

## Release procedure

1. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
2. Back up the production database and run `npx prisma migrate deploy`.
3. Deploy one release artifact to staging, then production.
4. Verify `/api/health` returns HTTP 200.
5. Exercise login, upload, scheduling, and a sandbox/test-platform publication.
6. Confirm the authenticated publish cron runs every five minutes and inspect
   failed publication counts.

## Incident response

- Disable the scheduler before investigating duplicate or malformed publications.
- Rotate `CRON_SECRET` after suspected scheduler exposure.
- Rotate provider credentials and `TOKEN_ENCRYPTION_KEY` through a planned token
  re-encryption process; changing the encryption key without migration makes stored
  OAuth tokens unreadable.
- Restore from the latest verified backup for destructive data incidents.
