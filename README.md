# Publiq

**Publiq** is a SaaS platform designed for content creators to upload their media once and have it distributed across multiple social platforms (YouTube, TikTok, Instagram, Facebook). The long-term vision includes a creator marketplace connecting brands with potential influencers.

## 🚀 Vision

1.  **Simplify Distribution**: "Write once, publish everywhere" for video content.
2.  **Monetize Influence**: Connect creators with brands through a transparent marketplace.

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: PostgreSQL (Supabase) + Prisma ORM v7.10
- **Auth**: Custom JWT with httpOnly cookies (secure state-bound OAuth)
- **Storage**: UploadThing
- **Payments**: PayFast (South Africa)
- **OAuth Providers**: Google (YouTube), Meta (Facebook/Instagram), TikTok
- **Testing**: Vitest + shadcn/ui mock setup

## 📅 Roadmap Layers

### Phase 1: Security & Reliable Publishing (Current)
- [x] Custom JWT Authentication with state-bound OAuth
- [x] Secure Social Account Connection (Google, Meta, TikTok)
- [x] OAuth Token Encryption at Rest (AES-256-GCM)
- [x] Config Validation (fail-closed on missing secrets)
- [ ] Atomic Publication Claiming & Idempotency
- [ ] Bounded Retries with Exponential Backoff
- [ ] Failed-Publication Visibility & Alerts

### Phase 2: Complete Publishing Workflow
- [x] Video Upload & Storage (UploadThing)
- [x] Publish to YouTube (Data API v3)
- [x] Post Scheduling
- [x] Basic Analytics
- [ ] TikTok Publishing (Beta)
- [ ] Instagram/Facebook Reels Publishing (Beta)
- [ ] Unified Dashboard & Performance Inbox

### Phase 3: Creator Marketplace & AI
- [ ] Public Creator Profiles
- [ ] Brand Search & Discovery
- [ ] Campaign Management
- [ ] AI-driven Analytics & Content Optimization

### Phase 4: Platform Expansion
- [ ] TikTok Complete Flow (Comments, Retries)
- [ ] Instagram/Facebook Reliability & Full Features
- [ ] Monetization & PayFast Dashboard

## Scheduled Publishing (Cron)

Publiq uses an authenticated cron endpoint to automatically publish scheduled content. The endpoint claims publications atomically, publishes to configured platforms, and implements bounded retries with exponential backoff for transient failures.

### Setup

1. Add a `CRON_SECRET` environment variable to your environment (use a URL-safe value, e.g. `openssl rand -hex 32`).
2. Configure your external cron service (cron-job.org, GitHub Actions, or similar) to POST to:
   - **URL**: `https://<your-site>.com/api/cron/publish`
   - **Method**: POST
   - **Header**: `Authorization: Bearer <CRON_SECRET>`
   - **Schedule**: Every 5 minutes (or more frequent for lower-latency publishing)
3. The endpoint processes all users' scheduled content atomically, preventing duplicate publishing and ensuring safe retries of transient failures.

## Documentation

For detailed implementation phases and technical plans, see [docs/implementation_plan.md](docs/implementation_plan.md).

## Demo collaboration data

Seed a local or staging database with a public creator, a brand, an open campaign,
and an invitation for the creator:

```bash
npm run db:seed
```

The demo accounts use `DemoPassword123!` and are safe to re-run because the seed
updates the same records. Do not run this against production.

To validate the API flow against a disposable PostgreSQL database:

```bash
E2E_DATABASE_URL='postgresql://...' npm run test:integration
```

To run the browser flow (creator publishes profile → brand discovers and invites
them → creator applies → brand accepts):

```bash
E2E_DATABASE_URL='postgresql://...' npx prisma db push
E2E_DATABASE_URL='postgresql://...' npm run test:e2e
```

Both tests create and remove their own brand, creator, campaign, and collaboration.
Set `E2E_DATABASE_URL` to a dedicated test database only.

## Test database keep-alive

The `Test Database Keep Alive` GitHub Actions workflow runs a read-only `SELECT 1`
every three days using the `E2E_DATABASE_URL` Actions secret. It can also be run
manually from the Actions tab. To test it locally:

```bash
npm run db:test:keepalive
```
