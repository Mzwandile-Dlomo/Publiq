import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGenerateAuthUrl, mockGetToken, mockSetCredentials, mockUserinfoGet } = vi.hoisted(() => ({
    mockGenerateAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?mock=true"),
    mockGetToken: vi.fn().mockResolvedValue({
        tokens: {
            access_token: "google-access-token",
            refresh_token: "google-refresh-token",
            expiry_date: Date.now() + 3600000,
        },
    }),
    mockSetCredentials: vi.fn(),
    mockUserinfoGet: vi.fn().mockResolvedValue({
        data: { id: "g-123", email: "test@gmail.com", given_name: "Test", family_name: "User", picture: "https://pic.url" },
    }),
}));

vi.mock("googleapis", () => ({
    google: {
        auth: {
            OAuth2: class MockOAuth2 {
                generateAuthUrl = mockGenerateAuthUrl;
                getToken = mockGetToken;
                setCredentials = mockSetCredentials;
            },
        },
        oauth2: vi.fn().mockReturnValue({
            userinfo: { get: mockUserinfoGet },
        }),
    },
}));

import { getGoogleAuthUrl, getGoogleTokens, getGoogleUser, oauth2Client, SCOPES } from "@/lib/google";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("SCOPES", () => {
    it("includes YouTube and profile scopes", () => {
        expect(SCOPES).toContain("https://www.googleapis.com/auth/youtube");
        expect(SCOPES).toContain("https://www.googleapis.com/auth/youtube.upload");
        expect(SCOPES).toContain("https://www.googleapis.com/auth/youtube.readonly");
        expect(SCOPES).toContain("https://www.googleapis.com/auth/userinfo.profile");
        expect(SCOPES).toContain("https://www.googleapis.com/auth/userinfo.email");
    });
});

describe("getGoogleAuthUrl", () => {
    it("generates an OAuth URL with correct params", () => {
        const url = getGoogleAuthUrl();
        expect(url).toBe("https://accounts.google.com/o/oauth2/v2/auth?mock=true");
        expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
            access_type: "offline",
            prompt: "consent",
            scope: SCOPES,
        });
    });
});

describe("getGoogleTokens", () => {
    it("exchanges auth code for tokens", async () => {
        const tokens = await getGoogleTokens("test-code");
        expect(mockGetToken).toHaveBeenCalledWith("test-code");
        expect(tokens).toHaveProperty("access_token");
        expect(tokens).toHaveProperty("refresh_token");
    });
});

describe("getGoogleUser", () => {
    it("fetches user info with provided tokens", async () => {
        const tokens = { access_token: "test-token" };
        const user = await getGoogleUser(tokens);

        expect(mockSetCredentials).toHaveBeenCalledWith(tokens);
        expect(user).toEqual({
            id: "g-123",
            email: "test@gmail.com",
            given_name: "Test",
            family_name: "User",
            picture: "https://pic.url",
        });
    });
});
