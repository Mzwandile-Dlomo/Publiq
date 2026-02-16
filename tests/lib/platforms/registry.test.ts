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
    it("returns youtube publisher", () => {
        const publisher = getPublisher("youtube");
        expect(publisher.platform).toBe("youtube");
    });

    it("returns facebook publisher", () => {
        const publisher = getPublisher("facebook");
        expect(publisher.platform).toBe("facebook");
    });

    it("returns instagram publisher", () => {
        const publisher = getPublisher("instagram");
        expect(publisher.platform).toBe("instagram");
    });

    it("returns tiktok publisher", () => {
        const publisher = getPublisher("tiktok");
        expect(publisher.platform).toBe("tiktok");
    });
});

describe("getStatsProvider", () => {
    it("returns youtube stats provider", () => {
        const provider = getStatsProvider("youtube");
        expect(provider.platform).toBe("youtube");
    });

    it("returns facebook stats provider", () => {
        const provider = getStatsProvider("facebook");
        expect(provider.platform).toBe("facebook");
    });
});
