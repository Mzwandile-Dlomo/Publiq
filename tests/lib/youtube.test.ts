import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVideosInsert, mockVideosList, mockVideosDelete, mockSetCredentials } = vi.hoisted(() => ({
    mockVideosInsert: vi.fn(),
    mockVideosList: vi.fn(),
    mockVideosDelete: vi.fn(),
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
                delete: mockVideosDelete,
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
import { uploadToYouTube, getYouTubeVideoStats, deleteFromYouTube } from "@/lib/youtube";

const mockFindFirst = vi.mocked(prisma.socialAccount.findFirst);

beforeEach(() => {
    vi.clearAllMocks();
});

describe("uploadToYouTube", () => {
    const account = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    it("uploads a video successfully", async () => {
        mockFindFirst.mockResolvedValueOnce(account as never);
        mockFetch.mockResolvedValueOnce({ body: new ReadableStream() });
        mockVideosInsert.mockResolvedValueOnce({
            data: { id: "yt-123", snippet: { title: "My Video" } },
        });

        const result = await uploadToYouTube("user-1", "content-1", "https://example.com/video.mp4", "My Video", "Description");

        expect(mockFindFirst).toHaveBeenCalledWith({
            where: { userId: "user-1", provider: "youtube" },
        });
        expect(mockSetCredentials).toHaveBeenCalledWith({
            access_token: "access-token",
            refresh_token: "refresh-token",
            expiry_date: account.expiresAt * 1000,
        });
        expect(mockVideosInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                part: ["snippet", "status"],
                requestBody: {
                    snippet: { title: "My Video", description: "Description" },
                    status: { privacyStatus: "public" },
                },
            })
        );
        expect(result).toEqual({ id: "yt-123", snippet: { title: "My Video" } });
    });

    it("throws when no YouTube account is connected", async () => {
        mockFindFirst.mockResolvedValueOnce(null);

        await expect(
            uploadToYouTube("user-1", "c-1", "https://example.com/v.mp4", "title", "desc")
        ).rejects.toThrow("No YouTube account connected");
    });

    it("throws when video file fetch fails", async () => {
        mockFindFirst.mockResolvedValueOnce(account as never);
        mockFetch.mockResolvedValueOnce({ body: null });

        await expect(
            uploadToYouTube("user-1", "c-1", "https://example.com/v.mp4", "title", "desc")
        ).rejects.toThrow("Failed to fetch video file");
    });
});

describe("getYouTubeVideoStats", () => {
    it("fetches stats for multiple videos", async () => {
        mockFindFirst.mockResolvedValueOnce({
            accessToken: "token",
            refreshToken: "refresh",
            expiresAt: null,
        } as never);

        mockVideosList.mockResolvedValueOnce({
            data: {
                items: [
                    { id: "v1", statistics: { viewCount: "500", likeCount: "50", commentCount: "10" } },
                ],
            },
        });

        const stats = await getYouTubeVideoStats("user-1", ["v1"]);

        expect(stats).toEqual({
            v1: { views: 500, likes: 50, comments: 10 },
        });
    });

    it("throws when no account connected", async () => {
        mockFindFirst.mockResolvedValueOnce(null);

        await expect(getYouTubeVideoStats("user-1", ["v1"])).rejects.toThrow(
            "No YouTube account connected"
        );
    });

    it("defaults missing counts to 0", async () => {
        mockFindFirst.mockResolvedValueOnce({
            accessToken: "token",
            refreshToken: null,
            expiresAt: null,
        } as never);

        mockVideosList.mockResolvedValueOnce({
            data: {
                items: [{ id: "v1", statistics: { viewCount: undefined, likeCount: undefined, commentCount: undefined } }],
            },
        });

        const stats = await getYouTubeVideoStats("user-1", ["v1"]);
        expect(stats.v1).toEqual({ views: 0, likes: 0, comments: 0 });
    });
});

describe("deleteFromYouTube", () => {
    it("deletes a video", async () => {
        mockFindFirst.mockResolvedValueOnce({
            accessToken: "token",
            refreshToken: "refresh",
            expiresAt: null,
        } as never);
        mockVideosDelete.mockResolvedValueOnce({});

        await deleteFromYouTube("user-1", "video-to-delete");

        expect(mockVideosDelete).toHaveBeenCalledWith({ id: "video-to-delete" });
    });

    it("throws when no account connected", async () => {
        mockFindFirst.mockResolvedValueOnce(null);

        await expect(deleteFromYouTube("user-1", "v1")).rejects.toThrow(
            "No YouTube account connected"
        );
    });
});
