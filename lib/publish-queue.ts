import { prisma } from "./prisma";
import type { PublicationLog } from "./publication-log-types";

/**
 * Generate an idempotency key for a publication attempt
 * Different attempts get different keys; same attempt always gets same key
 *
 * @param contentId - Content ID
 * @param platform - Platform name (youtube, tiktok, instagram, facebook)
 * @param attemptNumber - Attempt number (1, 2, 3, ...)
 * @returns Idempotency key: "contentId#platform#attemptNumber"
 */
export function generateIdempotencyKey(
  contentId: string,
  platform: string,
  attemptNumber: number
): string {
  return `${contentId}#${platform}#${attemptNumber}`;
}

/**
 * Calculate next retry time with exponential backoff
 * Returns { nextRetryAt, shouldGiveUp } to determine retry behavior
 *
 * Strategy:
 * - Max 5 attempts
 * - Exponential backoff: 1s, 2s, 4s, 8s, 16s
 * - Non-retryable errors (auth, validation) give up immediately
 * - Retryable errors (rate limits, timeouts) get full backoff
 *
 * @param attemptCount - Number of attempts so far
 * @param lastError - Error message from platform
 * @returns { nextRetryAt: Date, shouldGiveUp: boolean }
 */
export function calculateNextRetry(
  attemptCount: number,
  lastError: string
): { nextRetryAt: Date; shouldGiveUp: boolean } {
  const maxAttempts = 5;
  const baseDelayMs = 1000; // 1 second
  const maxDelayMs = 3600000; // 1 hour

  // Give up after max attempts
  if (attemptCount >= maxAttempts) {
    return { nextRetryAt: new Date(), shouldGiveUp: true };
  }

  // Classify error as retryable or not
  const permanentErrorPatterns = [
    "invalid_request",
    "authentication_error",
    "permission",
    "unauthorized",
    "forbidden",
    "not_found",
    "not found",
    "invalid_oauth_token",
    "invalid_access_token",
  ];

  const isPermanent = permanentErrorPatterns.some((pattern) =>
    lastError.toLowerCase().includes(pattern)
  );

  if (isPermanent) {
    return { nextRetryAt: new Date(), shouldGiveUp: true };
  }

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  const delayMs = Math.min(
    baseDelayMs * Math.pow(2, attemptCount - 1),
    maxDelayMs
  );

  // Add jitter (±10%) to prevent thundering herd
  const jitter = (Math.random() - 0.5) * 0.2 * delayMs;

  return {
    nextRetryAt: new Date(Date.now() + delayMs + jitter),
    shouldGiveUp: false,
  };
}

/**
 * Claim a publication for atomic publishing
 * Only one cron job can claim the same publication at a time
 *
 * Returns the claimed PublicationLog, or null if:
 * - No pending/retry publication found
 * - Another job claimed it first (race condition)
 *
 * @param contentId - Content ID
 * @param platform - Platform name
 * @param jobId - Unique job identifier (hostname + timestamp or UUID)
 * @returns PublicationLog if successfully claimed, null if race condition or no pending publication
 */
export async function claimPublication(
  contentId: string,
  platform: string,
  jobId: string
): Promise<PublicationLog | null> {
  // Find a pending or retry publication for this content+platform
  // Sort by createdAt to process oldest first (FIFO)
  const log = await prisma.publicationLog.findFirst({
    where: {
      contentId,
      platform,
      status: { in: ["pending", "retry"] },
      nextRetryAt: { lte: new Date() }, // Don't retry too early
    },
    orderBy: { createdAt: "asc" },
  });

  if (!log) {
    return null;
  }

  // Atomically update: mark as claimed if status hasn't changed
  // If another job already claimed it, this update will fail (race condition)
  try {
    const updated = await prisma.publicationLog.update({
      where: { id: log.id },
      data: {
        status: "claimed",
        claimedAt: new Date(),
        claimedBy: jobId,
        attemptCount: { increment: 1 },
      },
    });

    return updated;
  } catch {
    // Race condition: another job claimed first
    // Return null to skip this publication
    return null;
  }
}

/**
 * Check if a publication was already published (idempotency check)
 *
 * @param idempotencyKey - The idempotency key for this attempt
 * @returns PublicationLog if already published, null if not yet published
 */
export async function getPublishedIfIdempotent(
  idempotencyKey: string
): Promise<PublicationLog | null> {
  const log = await prisma.publicationLog.findUnique({
    where: { idempotencyKey },
  });

  // Return only if already published
  if (log?.status === "published") {
    return log;
  }

  return null;
}

/**
 * Update a publication log after a successful publish
 *
 * @param logId - Publication log ID
 * @param publishedUrl - URL of the published content
 * @returns Updated PublicationLog
 */
export async function markPublicationSuccess(
  logId: string,
  publishedUrl: string
): Promise<PublicationLog> {
  return prisma.publicationLog.update({
    where: { id: logId },
    data: {
      status: "published",
      publishedUrl,
    },
  });
}

/**
 * Update a publication log after a failed publish attempt
 *
 * Determines if the error is retryable and schedules next retry accordingly
 *
 * @param logId - Publication log ID
 * @param error - Error message from platform
 * @returns Updated PublicationLog
 */
export async function markPublicationFailure(
  logId: string,
  error: string
): Promise<PublicationLog> {
  // Get current attempt count
  const log = await prisma.publicationLog.findUniqueOrThrow({
    where: { id: logId },
  });

  const { nextRetryAt, shouldGiveUp } = calculateNextRetry(
    log.attemptCount,
    error
  );

  return prisma.publicationLog.update({
    where: { id: logId },
    data: {
      status: shouldGiveUp ? "failed" : "retry",
      lastError: error,
      nextRetryAt: shouldGiveUp ? null : nextRetryAt,
    },
  });
}

/**
 * Get all failed publications (for operator dashboard)
 *
 * @param limit - Max number to return (default 50)
 * @returns Array of failed publications with their content details
 */
export async function getFailedPublications(limit = 50) {
  const failed = await prisma.publicationLog.findMany({
    where: { status: "failed" },
    include: {
      content: {
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return failed;
}

/**
 * Get publication statistics for monitoring
 *
 * @returns Object with counts by status
 */
export async function getPublicationStats() {
  const stats = await prisma.publicationLog.groupBy({
    by: ["status"],
    _count: true,
  });

  return stats.reduce(
    (acc, { status, _count }) => {
      acc[status] = _count;
      return acc;
    },
    {} as Record<string, number>
  );
}

/**
 * Get pending publications ready for the next cron run
 *
 * @returns Array of publications ready to be claimed
 */
export async function getPendingPublications() {
  return prisma.publicationLog.findMany({
    where: {
      status: { in: ["pending", "retry"] },
      nextRetryAt: { lte: new Date() },
    },
    include: {
      content: {
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
