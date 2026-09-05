# Workstream 2: Publishing Reliability Implementation Plan

## Objectives

Replace the public GET scheduler trigger with authenticated POST, implement atomic publication claiming, add idempotency, implement bounded retries with exponential backoff, keep individual publication status separate from content state, and add structured logs plus operator-visible failed-publication view.

## Exit Criteria

- Concurrent scheduler runs cannot double-publish
- Transient failures retry safely with bounded exponential backoff
- Permanent failures are visible and actionable to operators
- Individual publication status surfaces partial success clearly
- Cron endpoint is authenticated and validates all incoming requests

## Phase 1: Schema Updates (Task 2.1)

### Changes to Prisma Schema

**Purpose**: Add publication-level state tracking separate from content state, enable atomic claiming, and support idempotency.

**File**: `prisma/schema.prisma`

**Modifications**:

1. **Add `PublicationLog` Model** (new)
   - `id` (String, @id, @default(cuid()))
   - `contentId` (String, FK to Content)
   - `platform` (String, enum of "youtube", "tiktok", "instagram", "facebook")
   - `status` (Enum: "pending", "claimed", "published", "failed", "retry")
   - `publishedUrl` (String?, nullable)
   - `claimedAt` (DateTime?, for atomic claiming timestamp)
   - `claimedBy` (String?, hostname or job ID for debugging)
   - `attemptCount` (Int, @default(0))
   - `idempotencyKey` (String, @unique, for deduplication)
   - `lastError` (String?, error message from platform)
   - `nextRetryAt` (DateTime?, when to retry)
   - `createdAt` (DateTime, @default(now()))
   - `updatedAt` (DateTime, @updatedAt)

2. **Update `Content` Model**
   - Remove or deprecate `status` field that tracks individual platform states
   - Add `publishStatus` (Enum: "draft", "scheduled", "published", "failed")
   - Add `publishedAt` (DateTime?, when first platform published)
   - Note: `publishStatus` reflects the overall content state; individual platform status lives in PublicationLog

3. **Create Indexes for Performance**
   ```prisma
   @@index([status, nextRetryAt])  // For finding next publications to retry
   @@index([contentId, platform])  // For querying per-content platform status
   @@index([claimedAt])             // For debugging concurrent claims
   ```

**Rationale**: Separates publication attempt state (per-platform, retriable, partial success) from content state (draft, scheduled, published), allowing operators to see which platforms succeeded and which failed.

## Phase 2: Cron Endpoint Update (Task 2.2)

### Replace GET with Authenticated POST

**File**: `app/api/cron/publish/route.ts`

**Changes**:

1. **Authentication**
   - Remove URL param `key=` query string handling
   - Add Bearer token validation: `Authorization: Bearer <CRON_SECRET>`
   - Compare `token.slice(7)` (skip "Bearer ") against `process.env.CRON_SECRET`
   - Return 401 Unauthorized if missing or mismatched
   - Return 403 Forbidden if token is expired (if implementing token expiry)

2. **HTTP Method**
   - Remove GET handler
   - Add POST handler with `export async function POST(req: Request)`
   - Validate Content-Type: application/json or empty body allowed

3. **Request Body** (optional, for future extensibility)
   - `{ "dryRun": boolean? }` to allow dry-run testing
   - Log the dryRun flag to structured logs

4. **Response Format**
   - Keep existing response structure
   - Add `claimedCount`, `publishedCount`, `retryCount`, `failedCount`
   - Example:
     ```json
     {
       "success": true,
       "timestamp": "2026-09-05T10:30:00Z",
       "claimedCount": 5,
       "publishedCount": 3,
       "retryCount": 1,
       "failedCount": 1,
       "errors": []
     }
     ```

**Rationale**: POST + Bearer token is more secure than GET + query param, prevents caching, and aligns with REST conventions for side-effecting operations.

## Phase 3: Atomic Claiming (Task 2.3)

### Implement Optimistic Locking for Publication Claims

**File**: `lib/publish-queue.ts` (new)

**Function**: `async function claimPublication(contentId: string, platform: string, jobId: string): Promise<PublicationLog | null>`

**Logic**:

1. **Fetch Unpublished Log**
   ```typescript
   const log = await prisma.publicationLog.findFirst({
     where: {
       contentId,
       platform,
       status: { in: ["pending", "retry"] },
       nextRetryAt: { lte: new Date() }  // Don't retry too early
     },
     orderBy: { createdAt: "asc" }
   });
   ```

2. **Atomic Update (Optimistic Locking)**
   ```typescript
   if (!log) return null;
   
   const updated = await prisma.publicationLog.update({
     where: { id: log.id },
     data: {
       status: "claimed",
       claimedAt: new Date(),
       claimedBy: jobId,
       attemptCount: { increment: 1 }
     }
   }).catch(() => null);  // Catch race condition: another job claimed first
   
   return updated;
   ```

3. **Return null** if:
   - No pending publication found
   - Another cron job claimed it first (update failed due to concurrent modification)

**Rationale**: Uses database-level atomicity to ensure only one cron job can claim a publication for processing.

## Phase 4: Idempotency (Task 2.4)

### Generate and Validate Idempotency Keys

**File**: `lib/publish-queue.ts` (continuation)

**Function**: `function generateIdempotencyKey(contentId: string, platform: string, attemptNumber: number): string`

**Implementation**:

```typescript
export function generateIdempotencyKey(
  contentId: string,
  platform: string,
  attemptNumber: number
): string {
  return `${contentId}#${platform}#${attemptNumber}`;
}
```

**Usage in Publication Flow**:

1. **On First Publish Attempt**
   - Generate key: `generateIdempotencyKey(contentId, platform, 1)`
   - Create PublicationLog with this key
   - Store key in platform's metadata (YouTube, TikTok, Meta API calls include Idempotency-Key header)

2. **On Retry**
   - Increment attempt: `generateIdempotencyKey(contentId, platform, attemptCount + 1)`
   - Create new PublicationLog entry with new key
   - Send to platform with updated Idempotency-Key header

3. **Idempotency Check Before Publishing**
   ```typescript
   const existing = await prisma.publicationLog.findUnique({
     where: { idempotencyKey }
   });
   
   if (existing?.status === "published") {
     // Already published successfully, skip
     return { success: true, cached: true, url: existing.publishedUrl };
   }
   ```

**Rationale**: Prevents platform-side duplicate publishing if the same attempt is retried. Different attempts get different keys, allowing safe retry chains.

## Phase 5: Exponential Backoff (Task 2.5)

### Implement Bounded Retry with Exponential Backoff

**File**: `lib/publish-queue.ts` (continuation)

**Function**: `function calculateNextRetry(attemptCount: number, lastError: string): { nextRetryAt: Date; shouldGiveUp: boolean }`

**Logic**:

```typescript
export function calculateNextRetry(
  attemptCount: number,
  lastError: string
): { nextRetryAt: Date; shouldGiveUp: boolean } {
  const maxAttempts = 5;
  const baseDelayMs = 1000;  // 1 second
  const maxDelayMs = 3600000;  // 1 hour
  
  if (attemptCount >= maxAttempts) {
    // Permanent failure: give up
    return { nextRetryAt: new Date(), shouldGiveUp: true };
  }
  
  // Check for non-retryable errors (permanent failures)
  const permanentErrors = [
    "invalid_request_error",
    "authentication_error",
    "permission_error",
    "not_found",
  ];
  
  const isPermanent = permanentErrors.some((err) => lastError.includes(err));
  if (isPermanent) {
    return { nextRetryAt: new Date(), shouldGiveUp: true };
  }
  
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  const delayMs = Math.min(baseDelayMs * Math.pow(2, attemptCount - 1), maxDelayMs);
  const jitter = Math.random() * 0.1 * delayMs;  // ±10% jitter
  
  return {
    nextRetryAt: new Date(Date.now() + delayMs + jitter),
    shouldGiveUp: false,
  };
}
```

**Usage in Publication Handler**:

```typescript
if (platformError) {
  const { nextRetryAt, shouldGiveUp } = calculateNextRetry(
    log.attemptCount,
    platformError.message
  );
  
  await prisma.publicationLog.update({
    where: { id: log.id },
    data: {
      status: shouldGiveUp ? "failed" : "retry",
      nextRetryAt,
      lastError: platformError.message,
    }
  });
  
  if (shouldGiveUp) {
    await logFailure(log, platformError);  // Notify operators
  }
}
```

**Rationale**: Retries transient failures (rate limits, timeouts, network errors) with exponential backoff; gives up quickly on permanent failures (auth, validation).

## Phase 6: Publication Handler (Task 2.6)

### Implement Safe Publishing with Atomic Claim & Retry Logic

**File**: `lib/publish-handlers/index.ts` (refactor existing)

**Function Signature**:

```typescript
export async function handleClaimedPublication(
  log: PublicationLog,
  content: Content,
  user: User
): Promise<{
  success: boolean;
  publishedUrl?: string;
  error?: string;
}>;
```

**Flow**:

1. **Pre-Flight Checks**
   - Verify user still owns content
   - Verify content still has media
   - Verify social account still connected and tokens valid

2. **Platform-Specific Publish**
   - Call appropriate handler (YouTube, TikTok, etc.)
   - Include idempotencyKey in request headers
   - Catch and categorize errors

3. **On Success**
   ```typescript
   await prisma.publicationLog.update({
     where: { id: log.id },
     data: {
       status: "published",
       publishedUrl: result.url,
     }
   });
   
   // Update content status only if all platforms published
   const allPublished = await prisma.publicationLog.count({
     where: { contentId: log.contentId, status: { not: "published" } }
   });
   if (allPublished === 0) {
     await prisma.content.update({
       where: { id: log.contentId },
       data: { publishStatus: "published", publishedAt: new Date() }
     });
   }
   ```

4. **On Retryable Error**
   - Update status to "retry"
   - Calculate next retry time
   - Update log with error message

5. **On Permanent Failure**
   - Update status to "failed"
   - Mark for operator attention
   - Log structured error

**Rationale**: Decouples individual platform publishing logic from claim/retry orchestration, making retries transparent.

## Phase 7: Failed Publication Visibility (Task 2.7)

### Add Operator Dashboard & Alerts

**File**: `app/api/admin/failed-publications/route.ts` (new)

**Endpoint**: `GET /api/admin/failed-publications`

**Authentication**: Requires admin user role

**Response**:

```typescript
{
  "failedPublications": [
    {
      "id": "pub_xxx",
      "contentId": "content_xxx",
      "platform": "youtube",
      "status": "failed",
      "attemptCount": 5,
      "lastError": "quota_exceeded",
      "failedAt": "2026-09-05T10:30:00Z",
      "content": {
        "id": "content_xxx",
        "title": "My Video",
        "createdBy": "user_xxx"
      }
    }
  ],
  "summary": {
    "totalFailed": 3,
    "byPlatform": { "youtube": 2, "tiktok": 1 }
  }
}
```

**UI Component** (Optional - Phase 2 extension):

- Admin dashboard showing failed publications
- Filter by platform, date range, user
- Retry / Mark as resolved actions
- Alert webhook for critical failures (Slack, etc.)

**Rationale**: Surfaces failures for human intervention without requiring error log grep.

## Phase 8: Structured Logging (Task 2.8)

### Add Contextual Logs for All Publication Attempts

**File**: `lib/publish-logger.ts` (new)

**Implementation**:

```typescript
export interface PublicationLogEntry {
  timestamp: string;
  eventType: "claimed" | "publishing" | "published" | "failed" | "retry";
  contentId: string;
  platform: string;
  userId: string;
  attemptCount: number;
  idempotencyKey: string;
  claimedBy?: string;
  publishedUrl?: string;
  error?: string;
  durationMs?: number;
}

export async function logPublication(entry: PublicationLogEntry) {
  console.log(JSON.stringify(entry));  // Structured log for aggregation
}
```

**Integration Points**:

1. When claiming: `logPublication({ eventType: "claimed", ... })`
2. Before platform call: `logPublication({ eventType: "publishing", ... })`
3. On success: `logPublication({ eventType: "published", publishedUrl, durationMs, ... })`
4. On retry: `logPublication({ eventType: "retry", error, nextRetryAt, ... })`
5. On permanent failure: `logPublication({ eventType: "failed", error, ... })`

**Rationale**: JSON logs enable log aggregation (CloudWatch, Datadog, etc.) and operator debugging.

## Implementation Order

| Task | Depends On | Estimated Size |
|------|------------|-----------------|
| 2.1: Schema updates | None | Small (Prisma model changes) |
| 2.2: Cron auth upgrade | None | Small (endpoint refactor) |
| 2.3: Atomic claiming | 2.1 | Small (database query pattern) |
| 2.4: Idempotency | 2.1, 2.3 | Tiny (key generation) |
| 2.5: Exponential backoff | 2.4 | Small (math + error classification) |
| 2.6: Publication handler | 2.1–2.5 | Medium (refactor + integrate) |
| 2.7: Operator dashboard | 2.1, 2.6 | Medium (admin API + UI) |
| 2.8: Structured logging | 2.6 | Small (logging calls) |

## Testing Strategy

### Unit Tests (Vitest)

- **2.3**: Atomic claiming with concurrent mocks
  - Two jobs claim same publication → only one succeeds
  - Log state transitions verified
- **2.4**: Idempotency key generation and validation
  - Same input → same key
  - Different attempts → different keys
- **2.5**: Backoff calculation
  - Exponential delays verified for attempts 1–5
  - Non-retryable errors identified
  - Max attempt cutoff enforced

### Integration Tests

- **2.1–2.6**: Full publication flow
  - Setup: content + social account
  - Claim → publish → verify PublicationLog state
  - Retry flow: trigger failure, verify next retry scheduled
  - Concurrent run: two cron jobs, one claim, one skip

### E2E Tests

- Creator schedules content
- Cron runs at scheduled time
- Publication appears on platform
- Operator views failed-publications endpoint if any fail

## Success Criteria

✅ Concurrent cron runs do not double-publish  
✅ Transient errors trigger exponential backoff retries  
✅ Permanent errors surface in operator dashboard  
✅ Individual publication status is visible separate from content state  
✅ All publications have structured logs for debugging  
✅ Cron endpoint requires valid Bearer token  

---

**Status**: Ready for implementation  
**Last Updated**: 2026-09-05  
**Next**: Begin with Task 2.1 (schema updates)
