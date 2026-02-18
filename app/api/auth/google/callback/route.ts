import { NextResponse } from "next/server";
import { getGoogleUser, createOAuthClient } from "@/lib/google";
import { verifySession } from "@/lib/auth";
import { revalidateUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
        return NextResponse.redirect(new URL("/dashboard?error=google_auth_failed", req.url));
    }

    if (!code) {
        return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const session = await verifySession();
    if (!session) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    try {
        const client = createOAuthClient();
        const { tokens } = await client.getToken(code);
        const userInfo = await getGoogleUser(tokens);

        // Save to database
        await prisma.socialAccount.upsert({
            where: {
                provider_providerId: {
                    provider: "youtube",
                    providerId: userInfo.id as string,
                },
            },
            update: {
                accessToken: tokens.access_token as string,
                refreshToken: tokens.refresh_token as string | undefined, // Only updates if present
                expiresAt: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
                email: userInfo.email,
                firstName: userInfo.given_name,
                lastName: userInfo.family_name,
                avatarUrl: userInfo.picture,
                updatedAt: new Date(),
            },
            create: {
                userId: session.userId as string,
                provider: "youtube",
                providerId: userInfo.id as string,
                accessToken: tokens.access_token as string,
                refreshToken: tokens.refresh_token as string | undefined,
                expiresAt: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
                email: userInfo.email,
                firstName: userInfo.given_name,
                lastName: userInfo.family_name,
                avatarUrl: userInfo.picture,
                isDefault: true,
            },
        });

        revalidateUser(session.userId as string);
        return NextResponse.redirect(new URL("/dashboard?success=youtube_connected", req.url));
    } catch (error) {
        console.error("Google Auth Error:", error);
        return NextResponse.redirect(new URL("/dashboard?error=google_auth_error", req.url));
    }
}
