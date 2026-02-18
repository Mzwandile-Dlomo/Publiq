import { describe, it, expect, vi } from "vitest";

vi.mock("googleapis", () => ({
    google: {
        auth: {
            OAuth2: class MockOAuth2 {
                setCredentials = vi.fn();
                generateAuthUrl = vi.fn();
                getToken = vi.fn();
            },
        },
        youtube: vi.fn().mockReturnValue({
            videos: { insert: vi.fn(), list: vi.fn() },
        }),
        oauth2: vi.fn().mockReturnValue({
            userinfo: { get: vi.fn() },
        }),
    },
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        socialAccount: { findFirst: vi.fn() },
    },
}));

import { getPublisher, getStatsProvider } from "@/lib/platforms/registry";

describe("getPublisher", () => {
    it("returns youtube publisher", async () => {
        const publisher = await getPublisher("youtube");
        expect(publisher.platform).toBe("youtube");
    });

    it("returns facebook publisher", async () => {
        const publisher = await getPublisher("facebook");
        expect(publisher.platform).toBe("facebook");
    });

    it("returns instagram publisher", async () => {
        const publisher = await getPublisher("instagram");
        expect(publisher.platform).toBe("instagram");
    });

    it("returns tiktok publisher", async () => {
        const publisher = await getPublisher("tiktok");
        expect(publisher.platform).toBe("tiktok");
    });
});

describe("getStatsProvider", () => {
    it("returns youtube stats provider", async () => {
        const provider = await getStatsProvider("youtube");
        expect(provider.platform).toBe("youtube");
    });

    it("returns facebook stats provider", async () => {
        const provider = await getStatsProvider("facebook");
        expect(provider.platform).toBe("facebook");
    });
});
