import { exchangeMetaCodeForToken, getMetaUserInfo, getFacebookPages } from "@/lib/meta";
import { exchangeMetaForLongLivedToken } from "@/lib/token-refresh";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createSession, verifySession } from "@/lib/auth";
import { revalidateUser } from "@/lib/auth-user";

const INSTAGRAM_REDIRECT_URI =
    process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:3000/api/auth/instagram/callback";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (error) {
        return NextResponse.redirect(new URL("/auth/login?error=instagram_access_denied", baseUrl));
    }

    if (!code) {
        return NextResponse.redirect(new URL("/auth/login?error=no_code", baseUrl));
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

        // Identify current Publiq user
        const session = await verifySession();
        let userId = session?.userId as string | undefined;

        if (!userId) {
            if (userInfo.email) {
                const existingUser = await prisma.user.findUnique({ where: { email: userInfo.email } });
                if (existingUser) userId = existingUser.id;
            }
        }

        if (!userId) {
            const newUser = await prisma.user.create({
                data: {
                    email: userInfo.email || `${userInfo.id}@facebook.social`,
                    name: userInfo.name,
                    image: userInfo.picture?.data?.url,
                }
            });
            userId = newUser.id;
        }

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
                            accessToken: page.access_token,
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
                            accessToken: page.access_token,
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
                new URL("/dashboard?error=no_instagram_business", baseUrl)
            );
        }

        await createSession(userId);
        revalidateUser(userId);
        return NextResponse.redirect(new URL("/dashboard", baseUrl));

    } catch (error) {
        console.error("Instagram Callback Error:", error);
        return NextResponse.redirect(new URL("/auth/login?error=instagram_callback_failed", baseUrl));
    }
}
