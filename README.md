# Publiq

**Publiq** is a SaaS platform designed for content creators to upload their media once and have it distributed across multiple social platforms (YouTube, TikTok, Instagram, Facebook). The long-term vision includes a creator marketplace connecting brands with potential influencers.

## 🚀 Vision

1.  **Simplify Distribution**: "Write once, publish everywhere" for video content.
2.  **Monetize Influence**: Connect creators with brands through a transparent marketplace.

## 🛠 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Prisma
- **Auth**: Clerk / NextAuth (Auth.js)
- **Storage**: UploadThing / AWS S3
- **Queue/Jobs**: BullMQ / Inngest

## 📅 Roadmap Layers

### Phase 1: Foundation & YouTube Publishing (Current Focus)
- [ ] Authentication (Secure Login/Signup)
- [ ] Connect Social Accounts (OAuth)
- [ ] Video Upload & Storage
- [ ] Publish to YouTube (Data API v3)
- [ ] Post Scheduling
- [ ] PayFast Subscription Integration
- [ ] Basic Analytics

### Phase 2: Platform Expansion
- [ ] TikTok Integration
- [ ] Instagram/Facebook Reels Integration
- [ ] Unified Dashboard & Inbox

### Phase 3: Creator Marketplace & AI
- [ ] Public Creator Profiles
- [ ] Brand Search & Discovery
- [ ] Campaign Management
- [ ] AI-driven Analytics & Content Optimization

## Scheduled Publishing (Cron)

Publiq uses a cron endpoint (`/api/cron/publish`) to automatically publish scheduled content. The endpoint checks for any content with a `scheduled` status whose `scheduledAt` time has passed, and publishes it to the configured platforms.

### Setup

1. Add a `CRON_SECRET` environment variable to your Netlify site (use a URL-safe value, e.g. `openssl rand -hex 32`).
2. Create a free cron job at [cron-job.org](https://cron-job.org) (or any external cron service) with:
   - **URL**: `https://<your-site>.netlify.app/api/cron/publish?key=<CRON_SECRET>`
   - **Method**: GET
   - **Schedule**: Every 5 minutes (or more frequent if needed)
3. The endpoint processes all users' scheduled content in a single run — no per-user configuration is needed.
