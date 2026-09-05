# Publiq Launch-Readiness Plan

## Product decision

Launch Publiq first as a reliable creator publishing workspace: upload, schedule,
publish, and review performance. Treat YouTube as the dependable launch channel;
TikTok, Instagram, and Facebook remain beta until their complete flows are proven.

The brand marketplace is not part of the first public launch. It introduces
verification, contracts, payouts, disputes, and moderation requirements that need
their own release plan.

## Definition of launch-ready

- A creator can securely sign up, connect an account, upload media, schedule a
  post, and see the final per-platform result.
- A scheduled post is published at most once, failures are retried safely, and
  operators can identify and resolve failures.
- Production configuration fails closed when required secrets are absent.
- Product pages only claim capabilities that are available to users.
- Core user journeys pass automated end-to-end or integration tests.

## Workstreams

### 1. Security foundation — P0

- Require `JWT_SECRET` in every environment; remove the fallback secret.
- Add startup/config validation for database, OAuth, payment, upload, and cron
  credentials, with a documented `.env.example` containing names only.
- Require an authenticated Publiq session before beginning every account-connect
  flow.
- Add OAuth `state` validation for Google, Meta, and TikTok; use PKCE where the
  provider supports it. Bind each callback to the user who initiated the flow.
- Do not create or switch Publiq users as a side effect of a social-account
  connection callback.
- Review token storage and encrypt provider access/refresh tokens at rest.

**Exit criteria:** attempted CSRF/login-linking flows are rejected, secrets cannot
silently fall back, and security tests cover each callback.

### 2. Publishing reliability — P0

- Replace the public GET scheduler trigger with an authenticated POST or a
  provider-verified scheduled-job endpoint.
- Claim scheduled publications atomically before publishing them. Store attempt
  count, claimed-at time, and an idempotency key per publication.
- Add bounded retries with exponential backoff for retryable platform failures.
- Keep individual publication status separate from the overall content state;
  surface partial success clearly.
- Add structured logs and an operator-visible failed-publication view or alert.

**Exit criteria:** concurrent scheduler runs cannot double-publish, a transient
failure retries safely, and permanent failures are visible and actionable.

### 3. Launch-scope integrity — P1

- Mark TikTok analytics/comments as unavailable until implemented.
- Verify YouTube, Instagram, and Facebook publishing with real sandbox/test
  accounts and document their media constraints and approval requirements.
- Change landing-page copy to remove unimplemented promises such as retries,
  alerts, and team-ready views.
- Gate the marketplace behind early access or hide it from the public navigation.

**Exit criteria:** every public promise corresponds to a tested capability.

### 4. Quality and delivery — P1

- Add Prisma migrations for the current schema and document deploy/rollback flow.
- Add `.env.example`, deployment runbook, OAuth redirect checklist, and cron/job
  setup instructions.
- Align the README with the actual stack (Next.js 16, custom JWT auth, Prisma,
  UploadThing, PayFast).
- Ensure a clean clone can run install, lint, typecheck, test, and build.
- Add CI for those checks.

**Exit criteria:** a new developer can reproduce the application and CI protects
the main branch.

### 5. Critical automated coverage — P1

- API integration tests: signup/login, content ownership, social-account
  ownership, publish, scheduled publication, and webhook validation.
- Database-backed tests for status transitions and duplicate-job prevention.
- Browser/E2E smoke tests for the creator’s core journey.

**Exit criteria:** the primary launch journey is automatically verified before
deployment.

## Suggested order

1. Security foundation
2. Publishing reliability
3. Migration/configuration/CI baseline
4. Core integration tests
5. Public-copy and scope cleanup
6. Platform beta validation

Do not start new marketplace features until items 1–5 are complete.
