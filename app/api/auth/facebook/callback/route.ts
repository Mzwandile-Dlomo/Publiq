import { exchangeMetaCodeForToken, getMetaUserInfo, getFacebookPages } from "@/lib/meta";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createSession, verifySession } from "@/lib/auth";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (error) {
        return NextResponse.redirect(new URL("/auth/login?error=meta_access_denied", baseUrl));
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

        // 1. Exchange code
        const tokenData = await exchangeMetaCodeForToken(code);
        const accessToken = tokenData.access_token;

        // 2. Get User Info
        const userInfo = await getMetaUserInfo(accessToken);

        // 3. Get Pages & Instagram Accounts
        const pages: FacebookPage[] = await getFacebookPages(accessToken);

        // Identify current Publiq User
        const session = await verifySession();
        let userId = session?.userId as string | undefined;

        if (!userId) {
            if (userInfo.email) {
                const existingUser = await prisma.user.findUnique({ where: { email: userInfo.email } });
                if (existingUser) userId = existingUser.id;
            }
        }

        if (!userId) {
            // Create new user
            const newUser = await prisma.user.create({
                data: {
                    email: userInfo.email || `${userInfo.id}@facebook.social`,
                    name: userInfo.name,
                    image: userInfo.picture?.data?.url,
                }
            });
            userId = newUser.id;
        }

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
                            accessToken: page.access_token,
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
                            accessToken: p.access_token,
                            userId: userId,
                        },
                        create: {
                            provider: "instagram",
                            providerId: p.instagram_business_account.id,
                            userId: userId,
                            accessToken: p.access_token,
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
                    accessToken: accessToken,
                    firstName: userInfo.name,
                    email: userInfo.email,
                    avatarUrl: userInfo.picture?.data?.url || `https://graph.facebook.com/${userInfo.id}/picture`,
                    isDefault: true,
                }
            });
        }

        if (!userId) {
            return NextResponse.redirect(new URL("/auth/login?error=meta_no_user", baseUrl));
        }

        await createSession(userId);
        return NextResponse.redirect(new URL("/dashboard", baseUrl));

    } catch (error) {
        console.error("Meta Callback Error:", error);
        return NextResponse.redirect(new URL("/auth/login?error=meta_callback_failed", baseUrl));
    }
}
