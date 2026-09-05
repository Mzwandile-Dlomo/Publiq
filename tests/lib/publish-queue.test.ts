import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateIdempotencyKey,
  calculateNextRetry,
  claimPublication,
  getPublishedIfIdempotent,
  markPublicationSuccess,
  markPublicationFailure,
  getFailedPublications,
  getPublicationStats,
  getPendingPublications,
} from "@/lib/publish-queue";
import { prisma } from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    publicationLog: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("publish-queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateIdempotencyKey", () => {
    it("generates consistent keys for same input", () => {
      const key1 = generateIdempotencyKey("content-123", "youtube", 1);
      const key2 = generateIdempotencyKey("content-123", "youtube", 1);

      expect(key1).toBe(key2);
      expect(key1).toBe("content-123#youtube#1");
    });

    it("generates different keys for different attempts", () => {
      const key1 = generateIdempotencyKey("content-123", "youtube", 1);
      const key2 = generateIdempotencyKey("content-123", "youtube", 2);

      expect(key1).not.toBe(key2);
    });

    it("generates different keys for different platforms", () => {
      const key1 = generateIdempotencyKey("content-123", "youtube", 1);
      const key2 = generateIdempotencyKey("content-123", "tiktok", 1);

      expect(key1).not.toBe(key2);
    });
  });

  describe("calculateNextRetry", () => {
    it("returns permanent failure for authentication errors", () => {
      const { shouldGiveUp, nextRetryAt } = calculateNextRetry(
        1,
        "authentication_error: invalid token"
      );

      expect(shouldGiveUp).toBe(true);
      expect(nextRetryAt).toBeInstanceOf(Date);
    });

    it("returns permanent failure for permission errors", () => {
      const { shouldGiveUp } = calculateNextRetry(1, "permission denied");

      expect(shouldGiveUp).toBe(true);
    });

    it("returns permanent failure for not found errors", () => {
      const { shouldGiveUp } = calculateNextRetry(1, "video not found");

      expect(shouldGiveUp).toBe(true);
    });

    it("returns retryable for rate limit errors", () => {
      const { shouldGiveUp } = calculateNextRetry(1, "rate_limit_exceeded");

      expect(shouldGiveUp).toBe(false);
    });

    it("returns retryable for timeout errors", () => {
      const { shouldGiveUp } = calculateNextRetry(1, "request timeout");

      expect(shouldGiveUp).toBe(false);
    });

    it("implements exponential backoff (1s, 2s, 4s, 8s, 16s)", () => {
      const now = Date.now();

      // Attempt 1: ~1s
      const retry1 = calculateNextRetry(1, "timeout");
      const delay1 = retry1.nextRetryAt.getTime() - now;
      expect(delay1).toBeGreaterThan(900); // 1s ± jitter
      expect(delay1).toBeLessThan(1100);

      // Attempt 2: ~2s
      const retry2 = calculateNextRetry(2, "timeout");
      const delay2 = retry2.nextRetryAt.getTime() - now;
      expect(delay2).toBeGreaterThan(1800); // 2s ± jitter
      expect(delay2).toBeLessThan(2200);

      // Attempt 3: ~4s
      const retry3 = calculateNextRetry(3, "timeout");
      const delay3 = retry3.nextRetryAt.getTime() - now;
      expect(delay3).toBeGreaterThan(3600); // 4s ± jitter
      expect(delay3).toBeLessThan(4400);
    });

    it("caps max attempts at 5", () => {
      const { shouldGiveUp: shouldGiveUp4 } = calculateNextRetry(
        4,
        "timeout"
      );
      expect(shouldGiveUp4).toBe(false);

      const { shouldGiveUp: shouldGiveUp5 } = calculateNextRetry(
        5,
        "timeout"
      );
      expect(shouldGiveUp5).toBe(true);
    });
  });

  describe("claimPublication", () => {
    it("returns null when no pending publication found", async () => {
      vi.mocked(prisma.publicationLog.findFirst).mockResolvedValueOnce(null);

      const result = await claimPublication("content-123", "youtube", "job-1");

      expect(result).toBeNull();
    });

    it("marks publication as claimed when found", async () => {
      const mockLog = {
        id: "log-123",
        contentId: "content-123",
        platform: "youtube",
        status: "pending",
        attemptCount: 0,
        idempotencyKey: "key-123",
        publishedUrl: null,
        claimedAt: null,
        claimedBy: null,
        lastError: null,
        nextRetryAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.publicationLog.findFirst).mockResolvedValueOnce(mockLog);
      vi.mocked(prisma.publicationLog.update).mockResolvedValueOnce({
        ...mockLog,
        status: "claimed",
        claimedAt: new Date(),
        claimedBy: "job-1",
        attemptCount: 1,
      });

      const result = await claimPublication(
        "content-123",
        "youtube",
        "job-1"
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe("claimed");
      expect(result?.claimedBy).toBe("job-1");
      expect(result?.attemptCount).toBe(1);
    });

    it("returns null on race condition (update fails)", async () => {
      const mockLog = {
        id: "log-123",
        contentId: "content-123",
        platform: "youtube",
        status: "pending",
        idempotencyKey: "key-123",
      };

      vi.mocked(prisma.publicationLog.findFirst).mockResolvedValueOnce(
        mockLog as any
      );
      vi.mocked(prisma.publicationLog.update).mockRejectedValueOnce(
        new Error("Unique constraint failed")
      );

      const result = await claimPublication(
        "content-123",
        "youtube",
        "job-1"
      );

      expect(result).toBeNull();
    });
  });

  describe("getPublishedIfIdempotent", () => {
    it("returns null if publication not found", async () => {
      vi.mocked(prisma.publicationLog.findUnique).mockResolvedValueOnce(null);

      const result = await getPublishedIfIdempotent("key-123");

      expect(result).toBeNull();
    });

    it("returns null if publication is pending", async () => {
      const mockLog = {
        id: "log-123",
        status: "pending",
      };

      vi.mocked(prisma.publicationLog.findUnique).mockResolvedValueOnce(
        mockLog as any
      );

      const result = await getPublishedIfIdempotent("key-123");

      expect(result).toBeNull();
    });

    it("returns publication if already published", async () => {
      const mockLog = {
        id: "log-123",
        status: "published",
        publishedUrl: "https://youtube.com/watch?v=xyz",
      };

      vi.mocked(prisma.publicationLog.findUnique).mockResolvedValueOnce(
        mockLog as any
      );

      const result = await getPublishedIfIdempotent("key-123");

      expect(result).not.toBeNull();
      expect(result?.status).toBe("published");
      expect(result?.publishedUrl).toBe("https://youtube.com/watch?v=xyz");
    });
  });

  describe("markPublicationSuccess", () => {
    it("marks publication as published with URL", async () => {
      const updatedLog = {
        id: "log-123",
        status: "published",
        publishedUrl: "https://youtube.com/watch?v=xyz",
      };

      vi.mocked(prisma.publicationLog.update).mockResolvedValueOnce(
        updatedLog as any
      );

      const result = await markPublicationSuccess(
        "log-123",
        "https://youtube.com/watch?v=xyz"
      );

      expect(result.status).toBe("published");
      expect(result.publishedUrl).toBe("https://youtube.com/watch?v=xyz");
    });
  });

  describe("markPublicationFailure", () => {
    it("marks as failed and gives up on permanent errors", async () => {
      const mockLog = {
        id: "log-123",
        attemptCount: 2,
        lastError: null,
      };

      vi.mocked(prisma.publicationLog.findUniqueOrThrow).mockResolvedValueOnce(
        mockLog as any
      );

      const updatedLog = {
        id: "log-123",
        status: "failed",
        lastError: "authentication_error: invalid token",
        nextRetryAt: null,
      };

      vi.mocked(prisma.publicationLog.update).mockResolvedValueOnce(
        updatedLog as any
      );

      const result = await markPublicationFailure(
        "log-123",
        "authentication_error: invalid token"
      );

      expect(result.status).toBe("failed");
      expect(result.lastError).toBe("authentication_error: invalid token");
      expect(result.nextRetryAt).toBeNull();
    });

    it("marks as retry and schedules next retry on transient errors", async () => {
      const mockLog = {
        id: "log-123",
        attemptCount: 1,
      };

      vi.mocked(prisma.publicationLog.findUniqueOrThrow).mockResolvedValueOnce(
        mockLog as any
      );

      const futureDate = new Date(Date.now() + 2000);
      const updatedLog = {
        id: "log-123",
        status: "retry",
        lastError: "timeout",
        nextRetryAt: futureDate,
      };

      vi.mocked(prisma.publicationLog.update).mockResolvedValueOnce(
        updatedLog as any
      );

      const result = await markPublicationFailure("log-123", "timeout");

      expect(result.status).toBe("retry");
      expect(result.lastError).toBe("timeout");
      expect(result.nextRetryAt).toEqual(futureDate);
    });
  });

  describe("getFailedPublications", () => {
    it("returns failed publications with content details", async () => {
      const mockFailed = [
        {
          id: "log-123",
          status: "failed",
          platform: "youtube",
          content: {
            id: "content-123",
            title: "My Video",
            user: { id: "user-123", email: "creator@example.com" },
          },
        },
      ];

      vi.mocked(prisma.publicationLog.findMany).mockResolvedValueOnce(
        mockFailed as any
      );

      const result = await getFailedPublications();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("failed");
      expect(result[0].content.title).toBe("My Video");
    });
  });

  describe("getPublicationStats", () => {
    it("returns count of publications by status", async () => {
      const mockStats = [
        { status: "published", _count: 10 },
        { status: "failed", _count: 2 },
        { status: "retry", _count: 1 },
      ];

      vi.mocked(prisma.publicationLog.groupBy).mockResolvedValueOnce(
        mockStats as any
      );

      const result = await getPublicationStats();

      expect(result).toEqual({
        published: 10,
        failed: 2,
        retry: 1,
      });
    });
  });

  describe("getPendingPublications", () => {
    it("returns only publications ready for next retry", async () => {
      const mockPending = [
        {
          id: "log-123",
          status: "pending",
          content: { user: { id: "user-123" } },
        },
      ];

      vi.mocked(prisma.publicationLog.findMany).mockResolvedValueOnce(
        mockPending as any
      );

      const result = await getPendingPublications();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("pending");
    });
  });
});
