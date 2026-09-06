import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetStatsProvider, mockUpdate, mockTransaction } = vi.hoisted(() => ({
    mockGetStatsProvider: vi.fn(),
    mockUpdate: vi.fn(),
    mockTransaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        publication: { update: mockUpdate },
        $transaction: mockTransaction,
    },
}));

vi.mock("@/lib/platforms/registry", () => ({
    getStatsProvider: mockGetStatsProvider,
}));

import { syncPublicationStats } from "@/lib/publication-sync";

describe("syncPublicationStats", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdate.mockImplementation((args) => Promise.resolve(args));
        mockTransaction.mockResolvedValue([]);
    });

    it("marks a publication unavailable when the platform no longer returns it", async () => {
        mockGetStatsProvider.mockResolvedValue({ getStats: vi.fn().mockResolvedValue({}) });

        const unavailableIds = await syncPublicationStats("user-1", [
            { id: "publication-1", platform: "youtube", platformPostId: "deleted-video" },
        ]);

        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: "publication-1" },
            data: { status: "unavailable", views: 0, likes: 0, comments: 0 },
        });
        expect(unavailableIds).toEqual(new Set(["publication-1"]));
    });

    it("keeps a returned publication successful and refreshes its stats", async () => {
        mockGetStatsProvider.mockResolvedValue({
            getStats: vi.fn().mockResolvedValue({
                "live-video": { views: 12, likes: 4, comments: 1 },
            }),
        });

        await syncPublicationStats("user-1", [
            { id: "publication-1", platform: "youtube", platformPostId: "live-video" },
        ]);

        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: "publication-1" },
            data: { views: 12, likes: 4, comments: 1 },
        });
    });
});
