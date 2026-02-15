import { exchangeMetaCodeForToken, getMetaUserInfo, getFacebookPages } from "@/lib/meta";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createSession, verifySession } from "@/lib/auth";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
        return NextResponse.redirect(new URL("/auth/login?error=meta_access_denied", request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL("/auth/login?error=no_code", request.url));
    }

    try {
        // 1. Exchange code
        const tokenData = await exchangeMetaCodeForToken(code);
        const accessToken = tokenData.access_token;
        const expiresIn = tokenData.expires_in; // seconds

        // 2. Get User Info
        const userInfo = await getMetaUserInfo(accessToken); // { id, name, email }

        // 3. Get Pages & Instagram Accounts
        const pages = await getFacebookPages(accessToken);

        // Strategy:
        // We link the "Main" Facebook user account to the Publiq User.
        // But for publishing, we need to know which Page/IG account to use.
        // For MVP: We will store the User Access Token as the primary "facebook" connection.
        // And we will ALSO store "instagram" connection if we find a linked IG account.
        // Actually, we need to publish to a specific PAGE.

        // Simplified approach:
        // 1. Find/Create User based on FB ID or Session.
        // 2. Store "facebook" SocialAccount with the User Access Token.
        // 3. Loop through pages, if there is a linked "instagram_business_account", store that as "instagram" SocialAccount (using the PAGE token, or user token + page ID? Usually Page Token is best for automation).
        // Wait, for IG Graph API, we act AS the Page. So we need the Page Access Token.

        // Let's store:
        // - One "facebook_user" account? Or just rely on re-fetching pages?
        // - To publish to FB, we need to let user SELECT which page.
        // - To publish to IG, we need to let user SELECT which IG account.

        // Complexity: Multiple Pages/IG accounts.
        // MVP: Just pick the FIRST Page and FIRST IG account found? Or store all?
        // Our schema has unique [provider, providerId].
        // We can store multiple entries.
        // provider="facebook", providerId="page_id_1"
        // provider="facebook", providerId="page_id_2"
        // provider="instagram", providerId="ig_id_1"

        // Let's do this:
        // 1. Identify current Publiq User.
        const session = await verifySession();
        let userId = session?.userId as string | undefined;

        // Check if FB user already linked (to find user if not logged in)
        // We use userInfo.id as a lookup, but that's the User ID, not Page ID.
        // Maybe we store a "facebook_user" record for login purposes?
        // Let's stick to the pattern:
        // If logged in -> Link.
        // If not -> Try to find user by email (FB provides email).

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

        // Link Accounts

        // 1. Facebook User (Optional, mostly for Auth)
        // await prisma.socialAccount.create(...) // Maybe not needed if we focus on Pages.

        // 2. Iterate Pages
        if (pages && pages.length > 0) {
            for (const page of pages) {
                // Store Facebook Page
                await prisma.socialAccount.upsert({
                    where: {
                        provider_providerId: {
                            provider: "facebook",
                            providerId: page.id
                        }
                    },
                    update: {
                        accessToken: page.access_token, // Page Token
                        name: page.name,
                        userId: userId,
                    },
                    create: {
                        provider: "facebook",
                        providerId: page.id,
                        userId: userId,
                        accessToken: page.access_token,
                        firstName: page.name, // Store page name
                        avatarUrl: `https://graph.facebook.com/${page.id}/picture`,
                    }
                });

                // Check for Instagram
                if (page.instagram_business_account) {
                    await prisma.socialAccount.upsert({
                        where: {
                            provider_providerId: {
                                provider: "instagram",
                                providerId: page.instagram_business_account.id
                            }
                        },
                        update: {
                            accessToken: page.access_token, // IG uses the PAGE access token
                            userId: userId,
                            // We might need to fetch IG details (username) separately or just store ID
                        },
                        create: {
                            provider: "instagram",
                            providerId: page.instagram_business_account.id,
                            userId: userId,
                            accessToken: page.access_token, // IG acts as Page
                            firstName: "Instagram Business", // We should fetch real name ideally
                            avatarUrl: "", // Need fetch
                        }
                    });
                }
            }
        } else {
            // User has no pages?
            return NextResponse.redirect(new URL("/dashboard?error=no_facebook_pages", request.url));
        }

        await createSession(userId);
        return NextResponse.redirect(new URL("/dashboard", request.url));

    } catch (error) {
        console.error("Meta Callback Error:", error);
        return NextResponse.redirect(new URL("/auth/login?error=meta_callback_failed", request.url));
    }
}
