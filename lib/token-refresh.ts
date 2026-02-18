import { prisma } from "./prisma";
import { createOAuthClient } from "./google";
import { TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET } from "./tiktok";
import { META_CLIENT_ID, META_CLIENT_SECRET } from "./meta";

const TOKEN_EXPIRY_BUFFER_SECONDS = 300; // Refresh 5 minutes before expiry

function isTokenExpired(expiresAt: number | null): boolean {
    if (!expiresAt) return false; // No expiry info — assume valid
    return Math.floor(Date.now() / 1000) >= expiresAt - TOKEN_EXPIRY_BUFFER_SECONDS;
}

async function updateStoredTokens(
    accountId: string,
    data: { accessToken?: string; refreshToken?: string; expiresAt?: number }
) {
    const updateData: Record<string, unknown> = {};
    if (data.accessToken) updateData.accessToken = data.accessToken;
    if (data.refreshToken) updateData.refreshToken = data.refreshToken;
    if (data.expiresAt) updateData.expiresAt = data.expiresAt;

    if (Object.keys(updateData).length > 0) {
        await prisma.socialAccount.update({
            where: { id: accountId },
            data: updateData,
        });
    }
}

/**
 * Refreshes a YouTube (Google) access token using the stored refresh token.
 * Returns the account with updated credentials.
 */
export async function refreshYouTubeToken(
    account: { id: string; accessToken: string; refreshToken: string | null; expiresAt: number | null }
) {
    if (!isTokenExpired(account.expiresAt)) {
        return account;
    }

    if (!account.refreshToken) {
        throw new Error("YouTube token expired and no refresh token available. Please reconnect your YouTube account.");
    }

    const client = createOAuthClient();
    client.setCredentials({
        refresh_token: account.refreshToken,
    });

    const { credentials } = await client.refreshAccessToken();

    const newAccessToken = credentials.access_token!;
    const newExpiresAt = credentials.expiry_date
        ? Math.floor(credentials.expiry_date / 1000)
        : undefined;
    const newRefreshToken = credentials.refresh_token || undefined;

    await updateStoredTokens(account.id, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt,
    });

    return {
        ...account,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || account.refreshToken,
        expiresAt: newExpiresAt ?? account.expiresAt,
    };
}

/**
 * Refreshes a TikTok access token using the stored refresh token.
 * TikTok refresh tokens are valid for 365 days; access tokens for ~24 hours.
 */
export async function refreshTikTokToken(
    account: { id: string; accessToken: string; refreshToken: string | null; expiresAt: number | null }
) {
    if (!isTokenExpired(account.expiresAt)) {
        return account;
    }

    if (!account.refreshToken) {
        throw new Error("TikTok token expired and no refresh token available. Please reconnect your TikTok account.");
    }

    const params = new URLSearchParams();
    params.append("client_key", TIKTOK_CLIENT_KEY);
    params.append("client_secret", TIKTOK_CLIENT_SECRET);
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", account.refreshToken);

    const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cache-Control": "no-cache",
        },
        body: params,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TikTok token refresh failed: ${errorText}. Please reconnect your TikTok account.`);
    }

    const data = await response.json();
    const { access_token, refresh_token, expires_in } = data;

    const newExpiresAt = Math.floor(Date.now() / 1000) + expires_in;

    await updateStoredTokens(account.id, {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: newExpiresAt,
    });

    return {
        ...account,
        accessToken: access_token,
        refreshToken: refresh_token || account.refreshToken,
        expiresAt: newExpiresAt,
    };
}

/**
 * Exchanges a short-lived Meta token for a long-lived one (~60 days).
 * Call this during the OAuth callback.
 */
export async function exchangeMetaForLongLivedToken(shortLivedToken: string): Promise<{
    access_token: string;
    expires_in: number;
}> {
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_CLIENT_ID}&client_secret=${META_CLIENT_SECRET}&fb_exchange_token=${shortLivedToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(`Meta long-lived token exchange failed: ${data.error.message}`);
    }

    return {
        access_token: data.access_token,
        expires_in: data.expires_in || 5184000, // Default ~60 days
    };
}

/**
 * Refreshes a Meta (Facebook/Instagram) access token.
 * Long-lived tokens can be refreshed if they haven't expired yet.
 * Tokens that are older than 60 days cannot be refreshed.
 */
export async function refreshMetaToken(
    account: { id: string; accessToken: string; expiresAt: number | null }
) {
    if (!isTokenExpired(account.expiresAt)) {
        return account;
    }

    // Meta long-lived tokens can be refreshed by exchanging a still-valid token
    // This only works if the token hasn't fully expired yet (within the 60-day window)
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_CLIENT_ID}&client_secret=${META_CLIENT_SECRET}&fb_exchange_token=${account.accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(
            `Meta token refresh failed: ${data.error.message}. Please reconnect your account.`
        );
    }

    const newExpiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 5184000);

    await updateStoredTokens(account.id, {
        accessToken: data.access_token,
        expiresAt: newExpiresAt,
    });

    return {
        ...account,
        accessToken: data.access_token,
        expiresAt: newExpiresAt,
    };
}
