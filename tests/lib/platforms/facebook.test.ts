import { describe, it, expect, vi, beforeEach } from "vitest";
import { facebookPublisher, facebookStatsProvider } from "@/lib/platforms/facebook";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        socialAccount: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
        },
    },
}));

vi.mock("@/lib/meta", () => ({
    publishFacebookVideo: vi.fn(),
    publishFacebookPhoto: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { publishFacebookVideo, publishFacebookPhoto } from "@/lib/meta";

const mockFindFirst = vi.mocked(prisma.socialAccount.findFirst);
const mockFindMany = vi.mocked(prisma.socialAccount.findMany);
const mockPublishVideo = vi.mocked(publishFacebookVideo);
vi.mocked(publishFacebookPhoto);

beforeEach(() => {
    vi.clearAllMocks();
});

describe("facebookPublisher", () => {
    const content = {
        id: "content-1",
        mediaUrl: "https://example.com/video.mp4",
        mediaType: "video" as const,
        title: "Test Video",
        description: "Test description",
    };

    it("has platform set to facebook", () => {
        expect(facebookPublisher.platform).toBe("facebook");
    });

    it("publishes a video using page credentials", async () => {
        const account = {
            accessToken: "page-token-abc",
            providerId: "page-123",
        } as never;

        // First call (isDefault: true) returns the account
        mockFindFirst.mockResolvedValueOnce(account);

        mockPublishVideo.mockResolvedValueOnce({ id: "video-789" });

        const result = await facebookPublisher.publish("user-1", content);

        expect(mockFindFirst).toHaveBeenCalledWith({
            where: { userId: "user-1", provider: "facebook", isDefault: true },
        });
        expect(mockPublishVideo).toHaveBeenCalledWith(
            "page-token-abc",
            "page-123",
            "https://example.com/video.mp4",
            "Test description"
        );
        expect(result.platformPostId).toBe("video-789");
        expect(result.publishedAt).toBeInstanceOf(Date);
    });

    it("uses title as fallback when description is null", async () => {
        mockFindFirst.mockResolvedValueOnce({
            accessToken: "page-token",
            providerId: "page-1",
        } as never);
        mockPublishVideo.mockResolvedValueOnce({ id: "v-1" });

        await facebookPublisher.publish("user-1", { ...content, description: null });

        expect(mockPublishVideo).toHaveBeenCalledWith(
            "page-token",
            "page-1",
            content.mediaUrl,
            "Test Video"
        );
    });

    it("throws when no Facebook account is connected", async () => {
        mockFindFirst.mockResolvedValueOnce(null);

        await expect(facebookPublisher.publish("user-1", content)).rejects.toThrow(
            "No Facebook Page connected"
        );
    });
});

describe("facebookStatsProvider", () => {
    it("has platform set to facebook", () => {
        expect(facebookStatsProvider.platform).toBe("facebook");
    });

    it("returns empty object when no account is connected", async () => {
        mockFindMany.mockResolvedValueOnce([]);
        const result = await facebookStatsProvider.getStats("user-1", [{ postId: "post-1" }]);
        expect(result).toEqual({});
    });

    it("returns empty object for empty post IDs array", async () => {
        const result = await facebookStatsProvider.getStats("user-1", []);
        expect(result).toEqual({});
    });

    it("fetches stats from Facebook Graph API", async () => {
        mockFindMany.mockResolvedValueOnce([
            { id: "acc-1", accessToken: "page-token-abc", providerId: "page-123", isDefault: true },
        ] as never);

        const mockFetchFn = vi.fn()
            // reactions call
            .mockResolvedValueOnce({
                ok: true,
                json: vi.fn().mockResolvedValue({ summary: { total_count: 42 } }),
            })
            // comments call
            .mockResolvedValueOnce({
                ok: true,
                json: vi.fn().mockResolvedValue({ summary: { total_count: 7 } }),
            })
            // insights call
            .mockResolvedValueOnce({
                ok: true,
                json: vi.fn().mockResolvedValue({ data: [{ values: [{ value: 1500 }] }] }),
            });
        vi.stubGlobal("fetch", mockFetchFn);

        const result = await facebookStatsProvider.getStats("user-1", [{ postId: "video-789" }]);

        expect(result).toEqual({
            "video-789": {
                views: 1500,
                likes: 42,
                comments: 7,
            },
        });

        vi.unstubAllGlobals();
    });

    it("skips posts that return API errors", async () => {
        mockFindMany.mockResolvedValueOnce([
            { id: "acc-1", accessToken: "page-token-abc", providerId: "page-123", isDefault: true },
        ] as never);

        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({
                error: { message: "Unsupported get request" },
            }),
        };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

        const result = await facebookStatsProvider.getStats("user-1", [{ postId: "bad-id" }]);
        // All three API calls return errors, so likes/comments/views are all 0
        expect(result).toEqual({ "bad-id": { views: 0, likes: 0, comments: 0 } });

        vi.unstubAllGlobals();
    });
});
