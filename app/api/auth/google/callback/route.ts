import { NextResponse } from "next/server";
import { getGoogleTokens, getGoogleUser, oauth2Client } from "@/lib/google";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma"; // Use the singleton instance

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
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
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

        return NextResponse.redirect(new URL("/dashboard?success=youtube_connected", req.url));
    } catch (error) {
        console.error("Google Auth Error:", error);
        return NextResponse.redirect(new URL("/dashboard?error=google_auth_error", req.url));
    }
}
