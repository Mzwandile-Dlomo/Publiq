import { NextResponse } from "next/server";
import { getGoogleUser, createOAuthClient } from "@/lib/google";
import { verifySession } from "@/lib/auth";
import { revalidateUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/token-encryption";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (error) {
        return NextResponse.redirect(`${baseUrl}/dashboard?error=google_auth_failed`);
    }

    if (!code) {
        return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const session = await verifySession();
    if (!session) {
        return NextResponse.redirect(`${baseUrl}/auth/login`);
    }

    try {
        const client = createOAuthClient();
        const { tokens } = await client.getToken(code);
        const userInfo = await getGoogleUser(tokens);

        // Encrypt tokens before storing
        const encryptedAccessToken = tokens.access_token 
            ? encryptToken(tokens.access_token as string)
            : null;
        const encryptedRefreshToken = tokens.refresh_token
            ? encryptToken(tokens.refresh_token as string)
            : undefined;

        // Save to database
        await prisma.socialAccount.upsert({
            where: {
                provider_providerId: {
                    provider: "youtube",
                    providerId: userInfo.id as string,
                },
            },
            update: {
                accessToken: encryptedAccessToken || "",
                refreshToken: encryptedRefreshToken,
                expiresAt: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
                email: userInfo.email,
                firstName: userInfo.given_name,
                lastName: userInfo.family_name,
                avatarUrl: userInfo.picture,
                tokenStatus: null,
                updatedAt: new Date(),
            },
            create: {
                userId: session.userId as string,
                provider: "youtube",
                providerId: userInfo.id as string,
                accessToken: encryptedAccessToken || "",
                refreshToken: encryptedRefreshToken,
                expiresAt: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
                email: userInfo.email,
                firstName: userInfo.given_name,
                lastName: userInfo.family_name,
                avatarUrl: userInfo.picture,
                isDefault: true,
            },
        });

        revalidateUser(session.userId as string);
        return NextResponse.redirect(`${baseUrl}/dashboard?success=youtube_connected`);
    } catch (error) {
        console.error("Google Auth Error:", error);
        return NextResponse.redirect(`${baseUrl}/dashboard?error=google_auth_error`);
    }
}
