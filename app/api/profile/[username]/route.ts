import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPublicationStats } from "@/lib/publication-sync";

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
                            id: true,
                            platform: true,
                            status: true,
                            platformPostId: true,
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

    const unavailablePublicationIds = await syncPublicationStats(
        user.id,
        user.content.flatMap((content) => content.publications)
    );

    const profile = {
        ...user,
        content: user.content
            .map((content) => ({
                ...content,
                publications: content.publications.filter(
                    (publication) => publication.status === "success" && !unavailablePublicationIds.has(publication.id)
                ),
            }))
            .filter((content) => content.publications.length > 0),
    };

    return NextResponse.json({ profile });
}
