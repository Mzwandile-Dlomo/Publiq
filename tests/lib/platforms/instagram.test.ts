import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        socialAccount: {
            findFirst: vi.fn(),
        },
    },
}));

vi.mock("@/lib/token-refresh", () => ({
    refreshMetaToken: vi.fn(),
}));

vi.mock("@/lib/meta", () => ({
    publishInstagramReel: vi.fn(),
    publishInstagramImage: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { prisma } from "@/lib/prisma";
import { refreshMetaToken } from "@/lib/token-refresh";
import { publishInstagramReel, publishInstagramImage } from "@/lib/meta";
import { instagramPublisher, instagramStatsProvider, instagramCommentsProvider } from "@/lib/platforms/instagram";

const mockFindFirst = vi.mocked(prisma.socialAccount.findFirst);
const mockRefresh = vi.mocked(refreshMetaToken);
const mockPublishReel = vi.mocked(publishInstagramReel);
const mockPublishImage = vi.mocked(publishInstagramImage);

const fakeAccount = {
    id: "acc-ig-1",
    accessToken: "ig-token",
    providerId: "ig-user-123",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockResolvedValue({ ...fakeAccount, accessToken: "ig-refreshed-token" } as never);
});

// ──────────────────────────────────────────────────────────────────────────────
describe("instagramPublisher", () => {
    const baseContent = {
        id: "c-1",
        mediaUrl: "https://cdn.example.com/reel.mp4",
        mediaType: "video" as const,
        title: "Instagram Reel",
        description: "Cool reel",
    };

    it("has platform set to instagram", () => {
        expect(instagramPublisher.platform).toBe("instagram");
    });

    it("publishes a reel for video content", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);
        mockPublishReel.mockResolvedValueOnce({ id: "reel-abc" });

        const result = await instagramPublisher.publish("user-1", baseContent);

        expect(mockFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ userId: "user-1", provider: "instagram" }) })
        );
        expect(mockPublishReel).toHaveBeenCalledWith(
            "ig-refreshed-token",
            fakeAccount.providerId,
            baseContent.mediaUrl,
            baseContent.description
        );
        expect(result.platformPostId).toBe("reel-abc");
        expect(result.publishedAt).toBeInstanceOf(Date);
    });

    it("publishes an image for image content", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);
        mockPublishImage.mockResolvedValueOnce({ id: "img-xyz" });

        const result = await instagramPublisher.publish("user-1", {
            ...baseContent,
            mediaType: "image",
            mediaUrl: "https://cdn.example.com/photo.jpg",
        });

        expect(mockPublishImage).toHaveBeenCalledWith(
            "ig-refreshed-token",
            fakeAccount.providerId,
            "https://cdn.example.com/photo.jpg",
            baseContent.description
        );
        expect(result.platformPostId).toBe("img-xyz");
    });

    it("uses title as caption when description is null", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);
        mockPublishReel.mockResolvedValueOnce({ id: "reel-1" });

        await instagramPublisher.publish("user-1", { ...baseContent, description: null });

        expect(mockPublishReel).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.anything(),
            baseContent.title
        );
    });

    it("throws when no Instagram account is connected", async () => {
        mockFindFirst.mockResolvedValueOnce(null);

        await expect(instagramPublisher.publish("user-1", baseContent)).rejects.toThrow(
            "No Instagram Business account connected"
        );
    });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("instagramStatsProvider", () => {
    it("has platform set to instagram", () => {
        expect(instagramStatsProvider.platform).toBe("instagram");
    });

    it("returns empty object when no account is connected", async () => {
        mockFindFirst.mockResolvedValueOnce(null);
        const result = await instagramStatsProvider.getStats("user-1", [{ postId: "post-1" }]);
        expect(result).toEqual({});
    });

    it("returns empty object for empty posts array", async () => {
        const result = await instagramStatsProvider.getStats("user-1", []);
        expect(result).toEqual({});
    });

    it("fetches stats from Graph API", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);

        // 1. Post fields (like_count, comments_count)
        mockFetch.mockResolvedValueOnce({
            json: vi.fn().mockResolvedValue({ like_count: 42, comments_count: 7 }),
        });
        // 2. Insights (impressions)
        mockFetch.mockResolvedValueOnce({
            json: vi.fn().mockResolvedValue({
                data: [{ values: [{ value: 1234 }] }],
            }),
        });

        const result = await instagramStatsProvider.getStats("user-1", [{ postId: "post-abc" }]);

        expect(result).toEqual({
            "post-abc": { views: 1234, likes: 42, comments: 7 },
        });
    });

    it("skips posts that return API errors", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);

        mockFetch.mockResolvedValueOnce({
            json: vi.fn().mockResolvedValue({ error: { message: "Invalid" } }),
        });

        const result = await instagramStatsProvider.getStats("user-1", [{ postId: "bad-post" }]);
        expect(result).toEqual({});
    });

    it("defaults views to 0 when insights unavailable", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);

        mockFetch
            .mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue({ like_count: 5, comments_count: 1 }),
            })
            .mockRejectedValueOnce(new Error("insights not available"));

        const result = await instagramStatsProvider.getStats("user-1", [{ postId: "post-1" }]);

        expect(result["post-1"]).toMatchObject({ views: 0, likes: 5, comments: 1 });
    });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("instagramCommentsProvider", () => {
    it("has platform set to instagram", () => {
        expect(instagramCommentsProvider.platform).toBe("instagram");
    });

    it("returns empty array when no account is connected", async () => {
        mockFindFirst.mockResolvedValueOnce(null);
        const result = await instagramCommentsProvider.getComments("user-1", "post-1");
        expect(result).toEqual([]);
    });

    it("fetches comments from Graph API", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);

        mockFetch.mockResolvedValueOnce({
            json: vi.fn().mockResolvedValue({
                data: [
                    {
                        id: "cm-1",
                        username: "alice",
                        text: "Nice!",
                        timestamp: "2024-01-01T00:00:00Z",
                        like_count: 3,
                        replies: null,
                    },
                ],
            }),
        });

        const result = await instagramCommentsProvider.getComments("user-1", "post-1");

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            id: "cm-1",
            authorName: "alice",
            text: "Nice!",
            likeCount: 3,
        });
    });

    it("returns empty array when API returns error", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);
        mockFetch.mockResolvedValueOnce({
            json: vi.fn().mockResolvedValue({ error: { message: "Invalid token" } }),
        });

        const result = await instagramCommentsProvider.getComments("user-1", "post-1");
        expect(result).toEqual([]);
    });
});
