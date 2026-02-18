# Publiq Implementation Plan

## Phase 1: Foundation & YouTube Publishing (Current)

### Completed

- **Authentication**: JWT-based sessions, signup/login, password hashing with bcryptjs
- **OAuth Connections**: YouTube, TikTok, Instagram, Facebook — connect/disconnect, default account selection
- **Video Upload & Storage**: UploadThing integration, video and image support
- **YouTube Publishing**: Upload, stats (views/likes/comments), comment threads, token refresh
- **Instagram Publishing**: Image and Reel posting, insights API, comment retrieval
- **Facebook Publishing**: Photo/video posting, reaction counts, comments, impressions
- **Post Scheduling**: Draft/scheduled/published states, cron endpoint (`/api/cron/publish`), external cron support
- **PayFast Integration**: Pro plan checkout, signature generation, ITN webhook, subscription tracking
- **Analytics Dashboard**: Per-platform stats, top-performing content, 60-second cache revalidation
- **Dashboard UI**: Stats overview, upload flow, content management, schedule view, settings, pricing page

### In Progress

- **TikTok Publishing**: Upload works, but stats and comments APIs are not yet implemented (marked TODO)
- **PayFast ITN**: Payment flow functional, ITN webhook handling needs refinement
- **Analytics**: Working but could benefit from real-time optimization and better caching

---

## Phase 2: Platform Expansion & Polish

### TikTok Completion

- [ ] Implement TikTok video stats API (`getStats` in `lib/platforms/tiktok.ts`)
- [ ] Implement TikTok comments API (`getComments` in `lib/platforms/tiktok.ts`)
- [ ] Add TikTok analytics to the unified dashboard

### Unified Inbox

- [ ] Aggregate comments from all platforms into a single view
- [ ] Allow replying to comments from within Publiq
- [ ] Real-time or polling-based comment sync

### Dashboard Enhancements

- [ ] Cross-platform comparison charts
- [ ] Date-range filtering for analytics
- [ ] Export analytics data (CSV/PDF)
- [ ] Content performance trends over time

### Quality & Reliability

- [ ] Improve test coverage (currently: YouTube, Facebook, Google, platform registry)
- [ ] Add integration tests for API routes
- [ ] Add TikTok and Instagram test suites
- [ ] API rate-limit handling and retry logic for platform APIs
- [ ] Better error reporting for failed publications

---

## Phase 3: Creator Marketplace & AI

### Public Creator Profiles

- [ ] Public-facing profile pages with portfolio and stats
- [ ] Creator discovery and search
- [ ] Category/niche tagging

### Brand & Campaign Management

- [ ] Brand accounts with dashboard
- [ ] Campaign creation and creator invitations
- [ ] Collaboration workflow (proposal, approval, delivery)
- [ ] Payment escrow between brands and creators

### AI-Driven Features

- [ ] Content optimization suggestions (titles, descriptions, thumbnails)
- [ ] Best posting time recommendations
- [ ] Audience analytics and growth insights
- [ ] Trend detection and content ideas

---

## Technical Architecture

### Project Structure

```
app/           Next.js App Router pages and API routes
lib/           Core business logic
  platforms/   Platform adapters (publisher, stats, comments interfaces)
  validators/  Zod schemas for request validation
components/    React UI components
prisma/        Database schema and migrations
tests/         Vitest test suites
docs/          Documentation
```

### Platform Adapter Pattern

Each platform implements standardized interfaces from `lib/platforms/types.ts`:

- **PlatformPublisher** — `publish(userId, content)` returns `{ platformPostId, publishedAt }`
- **PlatformStatsProvider** — `getStats(userId, posts)` returns views/likes/comments per post
- **PlatformCommentsProvider** — `getComments(userId, postId)` returns threaded comments

The registry (`lib/platforms/registry.ts`) routes operations to the correct adapter by platform name.

### Data Model

- **User** — Authentication and profile
- **SocialAccount** — OAuth credentials per platform, linked to user
- **Content** — Media files with title, description, status (draft/scheduled/published)
- **Publication** — Links content to platforms, tracks per-platform status and stats
- **Subscription** — PayFast subscription plan per user

### Key Environment Variables

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Session signing |
| `DATABASE_URL` | PostgreSQL connection |
| `CRON_SECRET` | Cron endpoint authentication |
| `GOOGLE_CLIENT_ID/SECRET` | YouTube OAuth |
| `TIKTOK_CLIENT_ID/SECRET` | TikTok OAuth |
| `META_CLIENT_ID/SECRET` | Instagram/Facebook OAuth |
| `PAYFAST_MERCHANT_ID/KEY/PASSPHRASE` | Payment processing |
| `UPLOADTHING_TOKEN` | File upload service |
| `NEXT_PUBLIC_APP_URL` | Base URL for OAuth redirects |

### Deployment

- **Hosting**: Netlify (Next.js)
- **Database**: PostgreSQL (external)
- **Scheduled Jobs**: External cron service (e.g., cron-job.org) hitting `/api/cron/publish` every 5 minutes
- **File Storage**: UploadThing
