import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { getStatsProvider } from "@/lib/platforms/registry";
import type { AnalyticsResponse, PlatformStats, TopContentItem } from "@/lib/analytics-types";

export async function GET() {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.userId as string;

        // Get connected platforms
        const socialAccounts = await prisma.socialAccount.findMany({
            where: { userId },
            select: { provider: true },
        });
        const connectedPlatforms = socialAccounts.map((a) => a.provider);

        if (connectedPlatforms.length === 0) {
            const response: AnalyticsResponse = {
                totals: { views: 0, likes: 0, comments: 0 },
                platforms: {},
                topContent: [],
            };
            return NextResponse.json(response);
        }

        // Fetch all successful publications for connected platforms only
        const publications = await prisma.publication.findMany({
            where: {
                content: { userId },
                status: "success",
                platformPostId: { not: null },
                platform: { in: connectedPlatforms },
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

        // Per-platform breakdown (connected platforms only)
        const platformGroups = await prisma.publication.groupBy({
            by: ["platform"],
            where: { content: { userId }, platform: { in: connectedPlatforms } },
            _sum: { views: true, likes: true, comments: true },
            _count: true,
        });

        const platforms: Partial<Record<Platform, PlatformStats>> = {};
        const totals = { views: 0, likes: 0, comments: 0 };

        for (const group of platformGroups) {
            const v = group._sum.views || 0;
            const l = group._sum.likes || 0;
            const c = group._sum.comments || 0;
            platforms[group.platform as Platform] = {
                views: v,
                likes: l,
                comments: c,
                publicationCount: group._count,
            };
            totals.views += v;
            totals.likes += l;
            totals.comments += c;
        }

        // Top 5 performing publications by views (connected platforms only)
        const topPubs = await prisma.publication.findMany({
            where: { content: { userId }, status: "success", platform: { in: connectedPlatforms } },
            orderBy: { views: "desc" },
            take: 5,
            include: { content: { select: { title: true } } },
        });

        const topContent: TopContentItem[] = topPubs.map((pub) => ({
            publicationId: pub.id,
            contentId: pub.contentId,
            title: pub.content.title,
            platform: pub.platform as Platform,
            views: pub.views,
            likes: pub.likes,
            comments: pub.comments,
            publishedAt: pub.publishedAt?.toISOString() ?? null,
            platformPostId: pub.platformPostId,
        }));

        const response: AnalyticsResponse = { totals, platforms, topContent };
        return NextResponse.json(response);
    } catch (error) {
        console.error("Analytics Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
