import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getYouTubeVideoStats } from "@/lib/youtube";

export async function GET() {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.userId as string;

        // Fetch published publications with YouTube video IDs
        const publications = await prisma.publication.findMany({
            where: {
                content: { userId },
                platform: "youtube",
                status: "success",
                platformPostId: { not: null },
            },
        });

        // Sync stats from YouTube if there are published videos
        const videoIds = publications
            .map((p) => p.platformPostId)
            .filter((id): id is string => id !== null);

        if (videoIds.length > 0) {
            try {
                const statsMap = await getYouTubeVideoStats(userId, videoIds);

                // Batch update publications with fresh stats
                for (const pub of publications) {
                    if (pub.platformPostId && statsMap[pub.platformPostId]) {
                        const s = statsMap[pub.platformPostId];
                        await prisma.publication.update({
                            where: { id: pub.id },
                            data: {
                                views: s.views,
                                likes: s.likes,
                                comments: s.comments,
                            },
                        });
                    }
                }
            } catch (syncError) {
                // If YouTube sync fails, fall through to return cached DB stats
                console.error("YouTube stats sync failed:", syncError);
            }
        }

        // Aggregate from DB (now updated with fresh stats)
        const stats = await prisma.publication.aggregate({
            where: {
                content: { userId },
            },
            _sum: {
                views: true,
                likes: true,
                comments: true,
            },
        });

        return NextResponse.json({
            views: stats._sum.views || 0,
            likes: stats._sum.likes || 0,
            comments: stats._sum.comments || 0,
        });
    } catch (error) {
        console.error("Analytics Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
