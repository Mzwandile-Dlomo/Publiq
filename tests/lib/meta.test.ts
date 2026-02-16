import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    getMetaAuthUrl,
    exchangeMetaCodeForToken,
    getMetaUserInfo,
    getFacebookPages,
    publishFacebookVideo,
    publishInstagramReel,
    META_SCOPES,
} from "@/lib/meta";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
    vi.clearAllMocks();
});

describe("getMetaAuthUrl", () => {
    it("returns a valid Facebook OAuth URL", () => {
        const url = getMetaAuthUrl();

        expect(url).toContain("https://www.facebook.com/v19.0/dialog/oauth");
        expect(url).toContain(`client_id=${process.env.META_CLIENT_ID}`);
        expect(url).toContain("redirect_uri=");
        expect(url).toContain("state=");
        expect(url).toContain("scope=");
    });

    it("includes all required scopes", () => {
        const url = getMetaAuthUrl();

        for (const scope of META_SCOPES) {
            expect(url).toContain(scope);
        }
    });
});

describe("META_SCOPES", () => {
    it("includes required Facebook and Instagram scopes", () => {
        expect(META_SCOPES).toContain("public_profile");
        expect(META_SCOPES).toContain("email");
        expect(META_SCOPES).toContain("pages_show_list");
        expect(META_SCOPES).toContain("pages_read_engagement");
        expect(META_SCOPES).toContain("pages_manage_posts");
        expect(META_SCOPES).toContain("instagram_basic");
        expect(META_SCOPES).toContain("instagram_content_publish");
    });
});

describe("exchangeMetaCodeForToken", () => {
    it("exchanges auth code for access token", async () => {
        const tokenData = { access_token: "fb-access-token-123", token_type: "bearer" };
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve(tokenData),
        });

        const result = await exchangeMetaCodeForToken("test-auth-code");

        expect(mockFetch).toHaveBeenCalledOnce();
        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain("https://graph.facebook.com/v19.0/oauth/access_token");
        expect(calledUrl).toContain("code=test-auth-code");
        expect(calledUrl).toContain(`client_id=${process.env.META_CLIENT_ID}`);
        expect(calledUrl).toContain(`client_secret=${process.env.META_CLIENT_SECRET}`);
        expect(result).toEqual(tokenData);
    });

    it("throws on error response", async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ error: { message: "Invalid code" } }),
        });

        await expect(exchangeMetaCodeForToken("bad-code")).rejects.toThrow("Invalid code");
    });
});

describe("getMetaUserInfo", () => {
    it("fetches user profile from Graph API", async () => {
        const userInfo = { id: "123", name: "Test User", email: "test@example.com", picture: { data: { url: "https://pic.url" } } };
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve(userInfo),
        });

        const result = await getMetaUserInfo("access-token-123");

        expect(mockFetch).toHaveBeenCalledOnce();
        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain("https://graph.facebook.com/me");
        expect(calledUrl).toContain("fields=id,name,email,picture");
        expect(calledUrl).toContain("access_token=access-token-123");
        expect(result).toEqual(userInfo);
    });

    it("throws on error response", async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ error: { message: "Invalid token" } }),
        });

        await expect(getMetaUserInfo("bad-token")).rejects.toThrow("Invalid token");
    });
});

describe("getFacebookPages", () => {
    it("fetches user's Facebook pages", async () => {
        const pages = [
            { id: "page-1", name: "My Page", access_token: "page-token-1", instagram_business_account: { id: "ig-1" } },
            { id: "page-2", name: "Other Page", access_token: "page-token-2" },
        ];
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ data: pages }),
        });

        const result = await getFacebookPages("access-token-123");

        expect(mockFetch).toHaveBeenCalledOnce();
        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain("https://graph.facebook.com/me/accounts");
        expect(calledUrl).toContain("instagram_business_account");
        expect(result).toEqual(pages);
    });

    it("throws on error response", async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ error: { message: "Permission denied" } }),
        });

        await expect(getFacebookPages("bad-token")).rejects.toThrow("Permission denied");
    });
});

describe("publishFacebookVideo", () => {
    it("publishes a video to a Facebook page", async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ id: "video-123" }),
        });

        const result = await publishFacebookVideo("page-token", "page-id", "https://example.com/video.mp4", "My video");

        expect(mockFetch).toHaveBeenCalledOnce();
        const [calledUrl, options] = mockFetch.mock.calls[0];
        expect(calledUrl).toContain("https://graph.facebook.com/page-id/videos");
        expect(options.method).toBe("POST");
        expect(JSON.parse(options.body)).toEqual({
            file_url: "https://example.com/video.mp4",
            description: "My video",
        });
        expect(result).toEqual({ id: "video-123" });
    });

    it("throws on error response", async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ error: { message: "Upload failed" } }),
        });

        await expect(
            publishFacebookVideo("token", "page-id", "https://example.com/video.mp4", "desc")
        ).rejects.toThrow("Upload failed");
    });
});

describe("publishInstagramReel", () => {
    it("creates a media container and publishes a reel", async () => {
        // 1. Create container
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ id: "container-123" }),
        });
        // 2. Status check - FINISHED immediately
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ status_code: "FINISHED" }),
        });
        // 3. Publish
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ id: "reel-456" }),
        });

        const result = await publishInstagramReel("page-token", "ig-user-id", "https://example.com/video.mp4", "My reel");

        expect(mockFetch).toHaveBeenCalledTimes(3);

        // Container creation
        const [containerUrl, containerOpts] = mockFetch.mock.calls[0];
        expect(containerUrl).toContain(`ig-user-id/media`);
        expect(JSON.parse(containerOpts.body)).toEqual({
            media_type: "REELS",
            video_url: "https://example.com/video.mp4",
            caption: "My reel",
        });

        // Publish
        const [publishUrl, publishOpts] = mockFetch.mock.calls[2];
        expect(publishUrl).toContain(`ig-user-id/media_publish`);
        expect(JSON.parse(publishOpts.body)).toEqual({
            creation_id: "container-123",
        });

        expect(result).toEqual({ id: "reel-456" });
    });

    it("throws when container processing fails", async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ id: "container-123" }),
        });
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ status_code: "ERROR" }),
        });

        await expect(
            publishInstagramReel("token", "ig-id", "https://example.com/video.mp4", "caption")
        ).rejects.toThrow("IG Media container failed processing");
    });

    it("throws when container creation returns error", async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ error: { message: "Invalid media" } }),
        });

        await expect(
            publishInstagramReel("token", "ig-id", "https://example.com/video.mp4", "caption")
        ).rejects.toThrow("Invalid media");
    });
});
