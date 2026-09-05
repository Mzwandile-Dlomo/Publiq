import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        socialAccount: {
            findFirst: vi.fn(),
        },
    },
}));

vi.mock("@/lib/token-refresh", () => ({
    refreshTikTokToken: vi.fn(),
}));

vi.mock("@/lib/tiktok", () => ({
    uploadToTikTok: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { prisma } from "@/lib/prisma";
import { refreshTikTokToken } from "@/lib/token-refresh";
import { uploadToTikTok } from "@/lib/tiktok";
import { tiktokPublisher, tiktokStatsProvider, tiktokCommentsProvider } from "@/lib/platforms/tiktok";

const mockFindFirst = vi.mocked(prisma.socialAccount.findFirst);
const mockRefresh = vi.mocked(refreshTikTokToken);
const mockUpload = vi.mocked(uploadToTikTok);

const fakeAccount = {
    id: "acc-1",
    accessToken: "tt-token",
    refreshToken: "tt-refresh",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockResolvedValue(fakeAccount as never);
});

// ──────────────────────────────────────────────────────────────────────────────
describe("tiktokPublisher", () => {
    const content = {
        id: "c-1",
        mediaUrl: "https://cdn.example.com/vid.mp4",
        mediaType: "video" as const,
        title: "TikTok Test",
        description: "Short desc",
    };

    it("has platform set to tiktok", () => {
        expect(tiktokPublisher.platform).toBe("tiktok");
    });

    it("publishes a video successfully", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);
        mockUpload.mockResolvedValueOnce({ id: "publish-123" });

        const result = await tiktokPublisher.publish("user-1", content);

        expect(mockFindFirst).toHaveBeenCalledWith({
            where: { userId: "user-1", provider: "tiktok" },
        });
        expect(mockRefresh).toHaveBeenCalledWith(fakeAccount);
        expect(mockUpload).toHaveBeenCalledWith(
            fakeAccount.accessToken,
            content.mediaUrl,
            content.description
        );
        expect(result.platformPostId).toBe("publish-123");
        expect(result.publishedAt).toBeInstanceOf(Date);
    });

    it("uses title as fallback when description is null", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);
        mockUpload.mockResolvedValueOnce({ id: "publish-456" });

        await tiktokPublisher.publish("user-1", { ...content, description: null });

        expect(mockUpload).toHaveBeenCalledWith(
            fakeAccount.accessToken,
            content.mediaUrl,
            content.title
        );
    });

    it("throws when no TikTok account is connected", async () => {
        mockFindFirst.mockResolvedValueOnce(null);

        await expect(tiktokPublisher.publish("user-1", content)).rejects.toThrow(
            "No TikTok account connected"
        );
    });

    it("throws for image posts", async () => {
        await expect(
            tiktokPublisher.publish("user-1", { ...content, mediaType: "image" })
        ).rejects.toThrow("TikTok does not support image posts");
    });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("tiktokStatsProvider", () => {
    it("has platform set to tiktok", () => {
        expect(tiktokStatsProvider.platform).toBe("tiktok");
    });

    it("returns empty object when no account is connected", async () => {
        mockFindFirst.mockResolvedValueOnce(null);
        const result = await tiktokStatsProvider.getStats("user-1", [{ postId: "vid-1" }]);
        expect(result).toEqual({});
    });

    it("returns empty object for empty posts array", async () => {
        const result = await tiktokStatsProvider.getStats("user-1", []);
        expect(result).toEqual({});
    });

    it("fetches stats from TikTok Video Query API", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
                error: { code: "ok" },
                data: {
                    videos: [
                        { id: "vid-1", view_count: 1000, like_count: 50, comment_count: 10 },
                        { id: "vid-2", view_count: 500, like_count: 25, comment_count: 5 },
                    ],
                },
            }),
        });

        const result = await tiktokStatsProvider.getStats("user-1", [
            { postId: "vid-1" },
            { postId: "vid-2" },
        ]);

        expect(result).toEqual({
            "vid-1": { views: 1000, likes: 50, comments: 10 },
            "vid-2": { views: 500, likes: 25, comments: 5 },
        });

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("open.tiktokapis.com/v2/video/query"),
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    Authorization: `Bearer ${fakeAccount.accessToken}`,
                }),
            })
        );
    });

    it("returns empty object when API returns an error code", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
                error: { code: "access_token_invalid", message: "Access token invalid" },
            }),
        });

        const result = await tiktokStatsProvider.getStats("user-1", [{ postId: "vid-1" }]);
        expect(result).toEqual({});
    });

    it("returns empty object when HTTP fetch fails", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);
        mockFetch.mockResolvedValueOnce({ ok: false, text: vi.fn().mockResolvedValue("error") });

        const result = await tiktokStatsProvider.getStats("user-1", [{ postId: "vid-1" }]);
        expect(result).toEqual({});
    });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("tiktokCommentsProvider", () => {
    it("has platform set to tiktok", () => {
        expect(tiktokCommentsProvider.platform).toBe("tiktok");
    });

    it("returns empty array when no account is connected", async () => {
        mockFindFirst.mockResolvedValueOnce(null);
        const result = await tiktokCommentsProvider.getComments("user-1", "vid-1");
        expect(result).toEqual([]);
    });

    it("fetches comments from TikTok Comment List API", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);

        // comments list response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
                error: { code: "ok" },
                data: {
                    comments: [
                        {
                            id: "c-1",
                            text: "Great video!",
                            like_count: 5,
                            create_time: 1700000000,
                            reply_count: 0,
                            user: { display_name: "Alice", unique_id: "alice123", avatar_url: "https://cdn.tt.com/alice.jpg" },
                        },
                    ],
                },
            }),
        });

        const result = await tiktokCommentsProvider.getComments("user-1", "vid-1");

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            id: "c-1",
            authorName: "Alice",
            text: "Great video!",
            likeCount: 5,
        });
        expect(result[0].timestamp).toBe(new Date(1700000000 * 1000).toISOString());
    });

    it("fetches replies for comments that have them", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);

        // Comments list
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
                error: { code: "ok" },
                data: {
                    comments: [
                        {
                            id: "c-1",
                            text: "Top comment",
                            like_count: 2,
                            create_time: 1700000000,
                            reply_count: 1,
                            user: { display_name: "Bob" },
                        },
                    ],
                },
            }),
        });

        // Replies
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
                data: {
                    replies: [
                        {
                            id: "r-1",
                            text: "Reply here",
                            like_count: 1,
                            create_time: 1700001000,
                            user: { display_name: "Carol" },
                        },
                    ],
                },
            }),
        });

        const result = await tiktokCommentsProvider.getComments("user-1", "vid-1");

        expect(result[0].replies).toHaveLength(1);
        expect(result[0].replies![0]).toMatchObject({ id: "r-1", text: "Reply here" });
    });

    it("returns empty array when API fails", async () => {
        mockFindFirst.mockResolvedValueOnce(fakeAccount as never);
        mockFetch.mockResolvedValueOnce({ ok: false });

        const result = await tiktokCommentsProvider.getComments("user-1", "vid-1");
        expect(result).toEqual([]);
    });
});
