import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVideosInsert, mockVideosList, mockSetCredentials } = vi.hoisted(() => ({
    mockVideosInsert: vi.fn(),
    mockVideosList: vi.fn(),
    mockSetCredentials: vi.fn(),
}));

vi.mock("googleapis", () => ({
    google: {
        auth: {
            OAuth2: class MockOAuth2 {
                setCredentials = mockSetCredentials;
            },
        },
        youtube: vi.fn().mockReturnValue({
            videos: {
                insert: mockVideosInsert,
                list: mockVideosList,
            },
        }),
    },
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        socialAccount: {
            findFirst: vi.fn(),
        },
    },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { prisma } from "@/lib/prisma";
import { youtubePublisher, youtubeStatsProvider } from "@/lib/platforms/youtube";

const mockFindFirst = vi.mocked(prisma.socialAccount.findFirst);

beforeEach(() => {
    vi.clearAllMocks();
});

describe("youtubePublisher", () => {
    const content = {
        id: "content-1",
        mediaUrl: "https://example.com/video.mp4",
        mediaType: "video" as const,
        title: "Test Video",
        description: "Test description",
    };

    const socialAccount = {
        accessToken: "yt-access-token",
        refreshToken: "yt-refresh-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    it("has platform set to youtube", () => {
        expect(youtubePublisher.platform).toBe("youtube");
    });

    it("uploads video to YouTube", async () => {
        mockFindFirst.mockResolvedValueOnce(socialAccount as any);
        mockFetch.mockResolvedValueOnce({ body: new ReadableStream() });
        mockVideosInsert.mockResolvedValueOnce({
            data: { id: "yt-video-123" },
        });

        const result = await youtubePublisher.publish("user-1", content);

        expect(mockFindFirst).toHaveBeenCalledWith({
            where: { userId: "user-1", provider: "youtube", isDefault: true },
        });
        expect(mockSetCredentials).toHaveBeenCalledWith({
            access_token: socialAccount.accessToken,
            refresh_token: socialAccount.refreshToken,
            expiry_date: socialAccount.expiresAt * 1000,
        });
        expect(mockVideosInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                part: ["snippet", "status"],
                requestBody: {
                    snippet: { title: "Test Video", description: "Test description" },
                    status: { privacyStatus: "public" },
                },
            })
        );
        expect(result.platformPostId).toBe("yt-video-123");
        expect(result.publishedAt).toBeInstanceOf(Date);
    });

    it("throws when no YouTube account is connected", async () => {
        mockFindFirst.mockResolvedValueOnce(null);

        await expect(youtubePublisher.publish("user-1", content)).rejects.toThrow(
            "No YouTube account connected"
        );
    });

    it("throws when video file fetch fails", async () => {
        mockFindFirst.mockResolvedValueOnce(socialAccount as any);
        mockFetch.mockResolvedValueOnce({ body: null });

        await expect(youtubePublisher.publish("user-1", content)).rejects.toThrow(
            "Failed to fetch video file"
        );
    });

    it("uses empty string when description is null", async () => {
        mockFindFirst.mockResolvedValueOnce(socialAccount as any);
        mockFetch.mockResolvedValueOnce({ body: new ReadableStream() });
        mockVideosInsert.mockResolvedValueOnce({ data: { id: "yt-1" } });

        await youtubePublisher.publish("user-1", { ...content, description: null });

        expect(mockVideosInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                requestBody: expect.objectContaining({
                    snippet: { title: "Test Video", description: "" },
                }),
            })
        );
    });
});

describe("youtubeStatsProvider", () => {
    it("has platform set to youtube", () => {
        expect(youtubeStatsProvider.platform).toBe("youtube");
    });

    it("fetches video statistics", async () => {
        mockFindFirst.mockResolvedValueOnce({
            accessToken: "token",
            refreshToken: "refresh",
            expiresAt: null,
        } as any);

        mockVideosList.mockResolvedValueOnce({
            data: {
                items: [
                    {
                        id: "vid-1",
                        statistics: { viewCount: "100", likeCount: "10", commentCount: "5" },
                    },
                    {
                        id: "vid-2",
                        statistics: { viewCount: "200", likeCount: "20", commentCount: "8" },
                    },
                ],
            },
        });

        const result = await youtubeStatsProvider.getStats("user-1", [
            { postId: "vid-1" },
            { postId: "vid-2" },
        ]);

        expect(mockVideosList).toHaveBeenCalledWith({
            part: ["statistics"],
            id: ["vid-1", "vid-2"],
        });
        expect(result).toEqual({
            "vid-1": { views: 100, likes: 10, comments: 5 },
            "vid-2": { views: 200, likes: 20, comments: 8 },
        });
    });

    it("returns empty stats when no account connected", async () => {
        mockFindFirst.mockResolvedValueOnce(null);

        const result = await youtubeStatsProvider.getStats("user-1", [{ postId: "vid-1" }]);
        expect(result).toEqual({});
    });

    it("handles missing statistics gracefully", async () => {
        mockFindFirst.mockResolvedValueOnce({
            accessToken: "token",
            refreshToken: null,
            expiresAt: null,
        } as any);

        mockVideosList.mockResolvedValueOnce({
            data: { items: [{ id: "vid-1", statistics: null }] },
        });

        const result = await youtubeStatsProvider.getStats("user-1", [{ postId: "vid-1" }]);
        expect(result).toEqual({});
    });

    it("handles expiresAt conversion correctly", async () => {
        const expiresAt = Math.floor(Date.now() / 1000) + 3600;
        mockFindFirst.mockResolvedValueOnce({
            accessToken: "token",
            refreshToken: "refresh",
            expiresAt,
        } as any);

        mockVideosList.mockResolvedValueOnce({ data: { items: [] } });

        await youtubeStatsProvider.getStats("user-1", []);

        expect(mockSetCredentials).toHaveBeenCalledWith({
            access_token: "token",
            refresh_token: "refresh",
            expiry_date: expiresAt * 1000,
        });
    });
});
