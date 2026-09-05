import { exchangeMetaCodeForToken, getMetaUserInfo, getFacebookPages } from "@/lib/meta";
import { exchangeMetaForLongLivedToken } from "@/lib/token-refresh";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { revalidateUser } from "@/lib/auth-user";
import { encryptToken } from "@/lib/token-encryption";
import { validateOAuthState } from "@/lib/oauth-state";

const INSTAGRAM_REDIRECT_URI =
    process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:3000/api/auth/instagram/callback";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (error) {
        return NextResponse.redirect(`${baseUrl}/auth/login?error=instagram_access_denied`);
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/auth/login?error=no_code`);
    }

    // Identify current Publiq user—must already be authenticated
    const session = await verifySession();
    const userId = session?.userId as string | undefined;

    if (!userId) {
        // SECURITY: Do not create or switch users as a side effect of OAuth callback.
        // User must be authenticated before initiating the account connection.
        return NextResponse.redirect(
            `${baseUrl}/auth/login?error=auth_required_for_connection`
        );
    }

    // Validate OAuth state for CSRF protection
    if (!state || !validateOAuthState(state, "facebook", userId)) {
        return NextResponse.redirect(`${baseUrl}/auth/login?error=invalid_oauth_state`);
    }

    try {
        type FacebookPage = {
            id: string;
            name: string;
            access_token: string;
            instagram_business_account?: { id: string } | null;
        };

        // 1. Exchange code using the Instagram-specific redirect URI
        const tokenData = await exchangeMetaCodeForToken(code, INSTAGRAM_REDIRECT_URI);

        // 2. Exchange short-lived token for long-lived token (~60 days)
        const longLived = await exchangeMetaForLongLivedToken(tokenData.access_token);
        const accessToken = longLived.access_token;
        const tokenExpiresAt = Math.floor(Date.now() / 1000) + longLived.expires_in;

        // 3. Get User Info
        const userInfo = await getMetaUserInfo(accessToken);

        // 4. Get Pages & find linked Instagram Business accounts (page tokens from long-lived user token are non-expiring)
        const pages: FacebookPage[] = await getFacebookPages(accessToken);
        console.log("Instagram OAuth - Pages returned:", JSON.stringify(pages, null, 2));

        // Collect Instagram Business accounts from pages
        let foundInstagram = false;

        if (pages && pages.length > 0) {
            for (const page of pages) {
                if (page.instagram_business_account) {
                    const igId = page.instagram_business_account.id;

                    // Fetch Instagram username and profile picture
                    let igName = "Instagram Business";
                    let igAvatar = "";
                    try {
                        const igRes = await fetch(
                            `https://graph.facebook.com/v19.0/${igId}?fields=username,profile_picture_url&access_token=${page.access_token}`
                        );
                        const igData = await igRes.json();
                        if (igData.username) igName = `@${igData.username}`;
                        if (igData.profile_picture_url) igAvatar = igData.profile_picture_url;
                    } catch {
                        // Fall back to defaults
                    }

                    await prisma.socialAccount.upsert({
                        where: {
                            provider_providerId: {
                                provider: "instagram",
                                providerId: igId,
                            }
                        },
                        update: {
                            accessToken: encryptToken(page.access_token),
                            expiresAt: tokenExpiresAt,
                            userId: userId,
                            firstName: igName,
                            name: igName,
                            avatarUrl: igAvatar,
                        },
                        create: {
                            provider: "instagram",
                            providerId: igId,
                            userId: userId,
                            accessToken: encryptToken(page.access_token),
                            expiresAt: tokenExpiresAt,
                            firstName: igName,
                            name: igName,
                            avatarUrl: igAvatar,
                            isDefault: true,
                        }
                    });
                    foundInstagram = true;
                }
            }
        }

        if (!foundInstagram) {
            return NextResponse.redirect(
                `${baseUrl}/dashboard?error=no_instagram_business`
            );
        }

        // Revalidate user and redirect to dashboard (session already exists from authentication)
        revalidateUser(userId);
        return NextResponse.redirect(`${baseUrl}/dashboard?success=instagram_connected`);

    } catch (error) {
        console.error("Instagram Callback Error:", error);
        return NextResponse.redirect(`${baseUrl}/auth/login?error=instagram_callback_failed`);
    }
}
