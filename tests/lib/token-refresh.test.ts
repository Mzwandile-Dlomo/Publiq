import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/prisma", () => ({
    prisma: {
        socialAccount: {
            update: (...args: unknown[]) => mockUpdate(...args),
            delete: (...args: unknown[]) => mockDelete(...args),
        },
    },
}));

vi.mock("@/lib/google", () => ({
    createOAuthClient: vi.fn(),
}));

const mockRefreshAccessToken = vi.fn();
const mockSetCredentials = vi.fn();
const mockOn = vi.fn();

vi.mock("googleapis", () => ({
    google: {
        auth: {
            OAuth2: class {
                setCredentials = mockSetCredentials;
                on = mockOn;
                refreshAccessToken = mockRefreshAccessToken;
            },
        },
    },
}));

import { createOAuthClient } from "@/lib/google";
import { refreshYouTubeToken, refreshTikTokToken, refreshMetaToken } from "@/lib/token-refresh";

const mockCreateOAuthClient = vi.mocked(createOAuthClient);

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
    vi.clearAllMocks();

    // Default: createOAuthClient returns an OAuth2 instance mock
    mockCreateOAuthClient.mockReturnValue({
        setCredentials: mockSetCredentials,
        on: mockOn,
        refreshAccessToken: mockRefreshAccessToken,
    } as never);
});

// ──────────────────────────────────────────────────────────────────────────────
describe("refreshYouTubeToken", () => {
    const account = {
        id: "acc-yt-1",
        accessToken: "old-yt-token",
        refreshToken: "yt-refresh",
        expiresAt: Math.floor(Date.now() / 1000) - 1000, // expired
    };

    it("returns the account unchanged when token is not expired", async () => {
        const fresh = { ...account, expiresAt: Math.floor(Date.now() / 1000) + 9999 };
        const result = await refreshYouTubeToken(fresh);
        expect(result).toBe(fresh);
        expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    });

    it("refreshes an expired token and updates the DB", async () => {
        const newExpiry = Date.now() + 3600 * 1000;
        mockRefreshAccessToken.mockResolvedValueOnce({
            credentials: {
                access_token: "new-yt-token",
                expiry_date: newExpiry,
                refresh_token: null,
            },
        });
        mockUpdate.mockResolvedValueOnce({});

        const result = await refreshYouTubeToken(account);

        expect(mockRefreshAccessToken).toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: account.id },
                data: expect.objectContaining({ accessToken: "new-yt-token" }),
            })
        );
        expect(result.accessToken).toBe("new-yt-token");
    });

    it("throws when there is no refresh token", async () => {
        await expect(
            refreshYouTubeToken({ ...account, refreshToken: null })
        ).rejects.toThrow("no refresh token");
    });

    it("deletes the account on invalid_grant error", async () => {
        mockRefreshAccessToken.mockRejectedValueOnce(new Error("invalid_grant"));
        mockDelete.mockResolvedValueOnce({});

        await expect(refreshYouTubeToken(account)).rejects.toThrow("revoked");
        expect(mockDelete).toHaveBeenCalledWith({ where: { id: account.id } });
    });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("refreshTikTokToken", () => {
    process.env.TIKTOK_CLIENT_KEY = "test-key";
    process.env.TIKTOK_CLIENT_SECRET = "test-secret";

    const account = {
        id: "acc-tt-1",
        accessToken: "old-tt-token",
        refreshToken: "tt-refresh",
        expiresAt: Math.floor(Date.now() / 1000) - 1000,
    };

    it("returns the account unchanged when token is not expired", async () => {
        const fresh = { ...account, expiresAt: Math.floor(Date.now() / 1000) + 9999 };
        const result = await refreshTikTokToken(fresh);
        expect(result).toBe(fresh);
    });

    it("refreshes an expired TikTok token", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
                access_token: "new-tt-token",
                refresh_token: "new-tt-refresh",
                expires_in: 86400,
            }),
        });
        mockUpdate.mockResolvedValueOnce({});

        const result = await refreshTikTokToken(account);

        expect(mockFetch).toHaveBeenCalledWith(
            "https://open.tiktokapis.com/v2/oauth/token/",
            expect.objectContaining({ method: "POST" })
        );
        expect(result.accessToken).toBe("new-tt-token");
        expect(result.refreshToken).toBe("new-tt-refresh");
    });

    it("throws when refresh token is missing", async () => {
        await expect(
            refreshTikTokToken({ ...account, refreshToken: null })
        ).rejects.toThrow("no refresh token");
    });

    it("throws when TikTok API returns non-ok response", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            text: vi.fn().mockResolvedValue("Unauthorized"),
        });

        await expect(refreshTikTokToken(account)).rejects.toThrow("token refresh failed");
    });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("refreshMetaToken", () => {
    process.env.META_CLIENT_ID = "test-meta-client-id";
    process.env.META_CLIENT_SECRET = "test-meta-client-secret";

    const account = {
        id: "acc-meta-1",
        accessToken: "old-meta-token",
        expiresAt: Math.floor(Date.now() / 1000) - 1000,
    };

    it("returns the account unchanged when token is not expired", async () => {
        const fresh = { ...account, expiresAt: Math.floor(Date.now() / 1000) + 9999 };
        const result = await refreshMetaToken(fresh);
        expect(result).toBe(fresh);
    });

    it("exchanges an expiring Meta token for a long-lived one", async () => {
        mockFetch.mockResolvedValueOnce({
            json: vi.fn().mockResolvedValue({
                access_token: "new-meta-token",
                expires_in: 5184000,
            }),
        });
        mockUpdate.mockResolvedValueOnce({});

        const result = await refreshMetaToken(account);

        expect(result.accessToken).toBe("new-meta-token");
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: account.id },
                data: expect.objectContaining({ accessToken: "new-meta-token" }),
            })
        );
    });

    it("throws when Meta Graph API returns an error", async () => {
        mockFetch.mockResolvedValueOnce({
            json: vi.fn().mockResolvedValue({
                error: { message: "Invalid OAuth access token" },
            }),
        });

        await expect(refreshMetaToken(account)).rejects.toThrow("token refresh failed");
    });
});
