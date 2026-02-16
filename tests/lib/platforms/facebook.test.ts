import { describe, it, expect, vi, beforeEach } from "vitest";
import { facebookPublisher, facebookStatsProvider } from "@/lib/platforms/facebook";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        socialAccount: {
            findFirst: vi.fn(),
        },
    },
}));

vi.mock("@/lib/meta", () => ({
    publishFacebookVideo: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { publishFacebookVideo } from "@/lib/meta";

const mockFindFirst = vi.mocked(prisma.socialAccount.findFirst);
const mockPublishVideo = vi.mocked(publishFacebookVideo);

beforeEach(() => {
    vi.clearAllMocks();
});

describe("facebookPublisher", () => {
    const content = {
        id: "content-1",
        videoUrl: "https://example.com/video.mp4",
        title: "Test Video",
        description: "Test description",
    };

    it("has platform set to facebook", () => {
        expect(facebookPublisher.platform).toBe("facebook");
    });

    it("publishes a video using page credentials", async () => {
        mockFindFirst.mockResolvedValueOnce({
            accessToken: "page-token-abc",
            providerId: "page-123",
        } as any);

        mockPublishVideo.mockResolvedValueOnce({ id: "video-789" });

        const result = await facebookPublisher.publish("user-1", content);

        expect(mockFindFirst).toHaveBeenCalledWith({
            where: { userId: "user-1", provider: "facebook" },
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
        } as any);
        mockPublishVideo.mockResolvedValueOnce({ id: "v-1" });

        await facebookPublisher.publish("user-1", { ...content, description: null });

        expect(mockPublishVideo).toHaveBeenCalledWith(
            "page-token",
            "page-1",
            content.videoUrl,
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

    it("returns empty stats (not yet implemented)", async () => {
        const result = await facebookStatsProvider.getStats("user-1", ["post-1"]);
        expect(result).toEqual({});
    });
});
