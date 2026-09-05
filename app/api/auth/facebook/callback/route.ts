import { exchangeMetaCodeForToken, getMetaUserInfo, getFacebookPages } from "@/lib/meta";
import { exchangeMetaForLongLivedToken } from "@/lib/token-refresh";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { revalidateUser } from "@/lib/auth-user";
import { encryptToken } from "@/lib/token-encryption";
import { validateOAuthState } from "@/lib/oauth-state";
import { assertMetaOAuthConfigValid } from "@/lib/config-validation";

export async function GET(request: Request) {
    assertMetaOAuthConfigValid();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (error) {
        return NextResponse.redirect(`${baseUrl}/auth/login?error=meta_access_denied`);
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/auth/login?error=no_code`);
    }

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

        // 1. Exchange code for short-lived token
        const tokenData = await exchangeMetaCodeForToken(code);

        // 2. Exchange short-lived token for long-lived token (~60 days)
        const longLived = await exchangeMetaForLongLivedToken(tokenData.access_token);
        const accessToken = longLived.access_token;
        const tokenExpiresAt = Math.floor(Date.now() / 1000) + longLived.expires_in;

        // 3. Get User Info
        const userInfo = await getMetaUserInfo(accessToken);

        // 4. Get Pages & Instagram Accounts (page tokens from long-lived user token are non-expiring)
        const pages: FacebookPage[] = await getFacebookPages(accessToken);

        // Remove any old facebook connection for this user (user-level or previous page)
        await prisma.socialAccount.deleteMany({
            where: { userId, provider: "facebook" }
        });

        if (pages && pages.length > 0) {
            // Store all Pages (first page becomes default)
            await Promise.all(
                pages.map((page: FacebookPage, index: number) =>
                    prisma.socialAccount.create({
                        data: {
                            provider: "facebook",
                            providerId: page.id,
                            userId: userId,
                            accessToken: encryptToken(page.access_token),
                            expiresAt: tokenExpiresAt,
                            firstName: page.name,
                            name: page.name,
                            email: userInfo.email,
                            avatarUrl: `https://graph.facebook.com/${page.id}/picture`,
                            isDefault: index === 0,
                        }
                    })
                )
            );

            // Store Instagram business accounts if linked to any page
            for (const p of pages) {
                if (p.instagram_business_account) {
                    await prisma.socialAccount.upsert({
                        where: {
                            provider_providerId: {
                                provider: "instagram",
                                providerId: p.instagram_business_account.id
                            }
                        },
                        update: {
                            accessToken: encryptToken(p.access_token),
                            expiresAt: tokenExpiresAt,
                            userId: userId,
                        },
                        create: {
                            provider: "instagram",
                            providerId: p.instagram_business_account.id,
                            userId: userId,
                            accessToken: encryptToken(p.access_token),
                            expiresAt: tokenExpiresAt,
                            firstName: "Instagram Business",
                            avatarUrl: "",
                        }
                    });
                }
            }
        } else {
            // No pages — store user account for connection display (publishing won't work)
            await prisma.socialAccount.create({
                data: {
                    provider: "facebook",
                    providerId: userInfo.id,
                    userId: userId,
                    accessToken: encryptToken(accessToken),
                    expiresAt: tokenExpiresAt,
                    firstName: userInfo.name,
                    email: userInfo.email,
                    avatarUrl: userInfo.picture?.data?.url || `https://graph.facebook.com/${userInfo.id}/picture`,
                    isDefault: true,
                }
            });
        }

        // Revalidate user and redirect to dashboard (session already exists from authentication)
        revalidateUser(userId);
        return NextResponse.redirect(`${baseUrl}/dashboard?success=facebook_connected`);

    } catch (error) {
        console.error("Meta Callback Error:", error);
        return NextResponse.redirect(`${baseUrl}/auth/login?error=meta_callback_failed`);
    }
}
