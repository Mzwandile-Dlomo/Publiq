import { exchangeTikTokCodeForToken, getTikTokUserInfo } from "@/lib/tiktok";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { revalidateUser } from "@/lib/auth-user";
import { encryptToken } from "@/lib/token-encryption";
import { validateOAuthState } from "@/lib/oauth-state";
import { assertTikTokOAuthConfigValid } from "@/lib/config-validation";

export async function GET(request: Request) {
    assertTikTokOAuthConfigValid();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (error) {
        return NextResponse.redirect(`${baseUrl}/auth/login?error=tiktok_access_denied`);
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/auth/login?error=no_code`);
    }

    // SECURITY: Require authenticated session before connecting social accounts.
    // User must be logged in with a Publiq account before connecting any platform.
    const session = await verifySession();
    const userId = session?.userId as string | undefined;

    if (!userId) {
        // SECURITY: Do not create or switch users as a side effect of OAuth callback.
        // User must be authenticated before initiating the account connection.
        return NextResponse.redirect(`${baseUrl}/auth/login?error=auth_required_for_connection`);
    }

    // Validate OAuth state for CSRF protection
    if (!state || !validateOAuthState(state, "tiktok", userId)) {
        return NextResponse.redirect(`${baseUrl}/auth/login?error=invalid_oauth_state`);
    }

    try {
        // 1. Exchange code for tokens
        const tokenData = await exchangeTikTokCodeForToken(code);

        // TikTok API v2 response structure for token:
        // { open_id: string, scope: string, access_token: string, expires_in: number, refresh_token: string, refresh_expires_in: number, token_type: "Bearer" }

        const { access_token, refresh_token, expires_in, open_id } = tokenData;

        // 2. Get User Info
        const userInfo = await getTikTokUserInfo(access_token);
        // userInfo structure: { open_id: string, union_id: string, avatar_url: string, display_name: string }

        // Check if this TikTok account is already linked to a different Publiq user
        const existingAccount = await prisma.socialAccount.findFirst({
            where: { provider: "tiktok", providerId: open_id },
            include: { user: true }
        });

        if (existingAccount && existingAccount.userId !== userId) {
            // This TikTok account is already linked to a different user.
            // User cannot switch accounts via OAuth callback.
            return NextResponse.redirect(`${baseUrl}/dashboard?error=account_already_linked`);
        }

        // Link or update TikTok account for the authenticated user
        await prisma.socialAccount.upsert({
            where: {
                provider_providerId: {
                    provider: "tiktok",
                    providerId: open_id
                }
            },
            update: {
                accessToken: encryptToken(access_token),
                refreshToken: encryptToken(refresh_token),
                expiresAt: Math.floor(Date.now() / 1000) + expires_in,
                updatedAt: new Date(),
            },
            create: {
                userId: userId,
                provider: "tiktok",
                providerId: open_id,
                accessToken: encryptToken(access_token),
                refreshToken: encryptToken(refresh_token),
                expiresAt: Math.floor(Date.now() / 1000) + expires_in,
                firstName: userInfo.display_name,
                avatarUrl: userInfo.avatar_url,
                isDefault: true,
            }
        });

        // Revalidate user and redirect to dashboard (session already exists from authentication)
        revalidateUser(userId);
        return NextResponse.redirect(`${baseUrl}/dashboard?success=tiktok_connected`);

    } catch (error) {
        console.error("TikTok Callback Error:", error);
        return NextResponse.redirect(`${baseUrl}/auth/login?error=tiktok_callback_failed`);
    }
}
