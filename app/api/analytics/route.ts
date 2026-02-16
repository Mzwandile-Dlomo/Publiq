import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { getStatsProvider } from "@/lib/platforms/registry";

export async function GET() {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.userId as string;

        // Fetch all successful publications grouped by platform
        const publications = await prisma.publication.findMany({
            where: {
                content: { userId },
                status: "success",
                platformPostId: { not: null },
            },
        });

        // Group post IDs by platform
        const postIdsByPlatform = new Map<Platform, { pubId: string; postId: string }[]>();
        for (const pub of publications) {
            const platform = pub.platform as Platform;
            if (!PLATFORMS.includes(platform)) continue;
            if (!pub.platformPostId) continue;

            const list = postIdsByPlatform.get(platform) || [];
            list.push({ pubId: pub.id, postId: pub.platformPostId });
            postIdsByPlatform.set(platform, list);
        }

        // Fetch stats from all platforms in parallel
        const syncPromises = Array.from(postIdsByPlatform.entries()).map(
            async ([platform, entries]) => {
                try {
                    const provider = getStatsProvider(platform);
                    const postIds = entries.map((e) => e.postId);
                    const statsMap = await provider.getStats(userId, postIds);

                    // Update publications with fresh stats
                    for (const entry of entries) {
                        const s = statsMap[entry.postId];
                        if (s) {
                            await prisma.publication.update({
                                where: { id: entry.pubId },
                                data: {
                                    views: s.views,
                                    likes: s.likes,
                                    comments: s.comments,
                                },
                            });
                        }
                    }
                } catch (syncError) {
                    console.error(`${platform} stats sync failed:`, syncError);
                }
            }
        );

        await Promise.all(syncPromises);

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
