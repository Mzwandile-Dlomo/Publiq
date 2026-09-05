import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/profile/[username] — public profile for a creator.
 * Only returns data when profilePublic=true.
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ username: string }> }
) {
    const { username } = await params;

    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            id: true,
            name: true,
            image: true,
            username: true,
            bio: true,
            niches: true,
            website: true,
            profilePublic: true,
            role: true,
            createdAt: true,
            socialAccounts: {
                select: { provider: true, name: true, avatarUrl: true },
            },
            content: {
                where: { status: "published" },
                orderBy: { createdAt: "desc" },
                take: 20,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    mediaType: true,
                    thumbnailUrl: true,
                    createdAt: true,
                    publications: {
                        select: {
                            platform: true,
                            views: true,
                            likes: true,
                            comments: true,
                        },
                    },
                },
            },
        },
    });

    if (!user || !user.profilePublic) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: user });
}
