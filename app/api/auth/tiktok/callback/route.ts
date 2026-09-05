import { exchangeTikTokCodeForToken, getTikTokUserInfo } from "@/lib/tiktok";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { revalidateUser } from "@/lib/auth-user";
import { encryptToken } from "@/lib/token-encryption";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
        return NextResponse.redirect(new URL("/auth/login?error=tiktok_access_denied", request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL("/auth/login?error=no_code", request.url));
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

        // 3. Find or Create User
        // We try to link by email if available, but TikTok often doesn't share email easily in v2 without special review.
        // So we might need to rely on existing session OR create a new user based on TikTok ID if they are logging in.

        // STRATEGY: 
        // If user is ALREADY logged in (we can check session cookie?), link account.
        // If not logged in, try to find existing SocialAccount by providerId (open_id).
        // If found, log them in. 
        // If not found, create new User and SocialAccount.

        // NOTE: For better security/UX, usually you want 'Connect Account' from Dashboard vs 'Log In' from public.
        // Let's assume this endpoint handles BOTH but we need to know the context.
        // Since we are using our custom session cookie, we can try to read it.

        // But `createSession` sets the cookie. converting `verifySession` to work here might be tricky if not exported cleanly or if it's edge compatible.
        // Let's assume for MVP: 
        // Scenario A: Connecting from Dashboard -> Client sends user ID in state? OR we just rely on the fact that if they are connecting they might have a session.
        // BUT common OAuth flows lose cookies if samesite is strict? No, usually cookies are sent.

        // Let's prioritize Logic:
        // 1. Search SocialAccount by provider="tiktok" & providerId=open_id
        // 2. If found -> Get associated user -> Create Session -> Redirect Dashboard.
        // 3. If NOT found:
        //    a. Is there a current user session? (How to check? request.cookies.get('session')?)
        //    b. If yes -> Link to that user.
        //    c. If no -> Create NEW user (User placeholder email? or just use openid@tiktok.placeholder) -> Create Session -> Redirect.

        // SECURITY: Require authenticated session before connecting social accounts.
        // User must be logged in with a Publiq account before connecting any platform.
        const session = await verifySession();
        const userId = session?.userId as string | undefined;

        if (!userId) {
            // SECURITY: Do not create or switch users as a side effect of OAuth callback.
            // User must be authenticated before initiating the account connection.
            return NextResponse.redirect(new URL("/auth/login?error=auth_required_for_connection", request.url));
        }

        // Check if this TikTok account is already linked to a different Publiq user
        const existingAccount = await prisma.socialAccount.findFirst({
            where: { provider: "tiktok", providerId: open_id },
            include: { user: true }
        });

        if (existingAccount && existingAccount.userId !== userId) {
            // This TikTok account is already linked to a different user.
            // User cannot switch accounts via OAuth callback.
            return NextResponse.redirect(new URL("/dashboard?error=account_already_linked", request.url));
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
        return NextResponse.redirect(new URL("/dashboard?success=tiktok_connected", request.url));

    } catch (error) {
        console.error("TikTok Callback Error:", error);
        return NextResponse.redirect(new URL("/auth/login?error=tiktok_callback_failed", request.url));
    }
}
