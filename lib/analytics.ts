import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { getStatsProvider } from "@/lib/platforms/registry";
import type { AnalyticsResponse, PlatformStats, TopContentItem } from "@/lib/analytics-types";

type SocialAccountProvider = { provider: string };
type PublicationEntry = {
    id: string;
    platform: string;
    platformPostId: string | null;
    socialAccountId: string | null;
};
type TopPublication = {
    id: string;
    contentId: string;
    platform: string;
    views: number | null;
    likes: number | null;
    comments: number | null;
    publishedAt: Date | null;
    platformPostId: string | null;
    content: { title: string };
};

async function fetchAnalytics(userId: string): Promise<AnalyticsResponse> {
    const socialAccounts: SocialAccountProvider[] = await prisma.socialAccount.findMany({
        where: { userId },
        select: { provider: true },
    });
    const connectedPlatforms = socialAccounts.map((a: SocialAccountProvider) => a.provider);

    if (connectedPlatforms.length === 0) {
        return { totals: { views: 0, likes: 0, comments: 0 }, platforms: {}, topContent: [] };
    }

    const publications: PublicationEntry[] = await prisma.publication.findMany({
        where: {
            content: { userId },
            status: "success",
            platformPostId: { not: null },
            platform: { in: connectedPlatforms },
        },
        select: {
            id: true,
            platform: true,
            platformPostId: true,
            socialAccountId: true,
        },
    });

    const postIdsByPlatform = new Map<Platform, { pubId: string; postId: string; socialAccountId: string | null }[]>();
    for (const pub of publications) {
        const platform = pub.platform as Platform;
        if (!PLATFORMS.includes(platform)) continue;
        if (!pub.platformPostId) continue;
        const list = postIdsByPlatform.get(platform) || [];
        list.push({ pubId: pub.id, postId: pub.platformPostId, socialAccountId: pub.socialAccountId });
        postIdsByPlatform.set(platform, list);
    }

    // Sync stats from external platforms
    const syncPromises = Array.from(postIdsByPlatform.entries()).map(
        async ([platform, entries]) => {
            try {
                const provider = await getStatsProvider(platform);
                const statsMap = await provider.getStats(
                    userId,
                    entries.map((e) => ({ postId: e.postId, socialAccountId: e.socialAccountId }))
                );
                await prisma.$transaction(
                    entries
                        .filter((entry) => statsMap[entry.postId])
                        .map((entry) => {
                            const s = statsMap[entry.postId];
                            return prisma.publication.update({
                                where: { id: entry.pubId },
                                data: { views: s.views, likes: s.likes, comments: s.comments },
                            });
                        })
                );
            } catch (syncError) {
                console.error(`${platform} stats sync failed:`, syncError);
            }
        }
    );
    await Promise.all(syncPromises);

    // Per-platform breakdown
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
            views: v, likes: l, comments: c, publicationCount: group._count,
        };
        totals.views += v;
        totals.likes += l;
        totals.comments += c;
    }

    // Top 5 performing publications
    const topPubs: TopPublication[] = await prisma.publication.findMany({
        where: { content: { userId }, status: "success", platform: { in: connectedPlatforms } },
        orderBy: { views: "desc" },
        take: 5,
        include: { content: { select: { title: true } } },
    });

    const topContent: TopContentItem[] = topPubs.map((pub: TopPublication) => ({
        publicationId: pub.id,
        contentId: pub.contentId,
        title: pub.content.title,
        platform: pub.platform as Platform,
        views: pub.views ?? 0,
        likes: pub.likes ?? 0,
        comments: pub.comments ?? 0,
        publishedAt: pub.publishedAt?.toISOString() ?? null,
        platformPostId: pub.platformPostId,
    }));

    return { totals, platforms, topContent };
}

export const getAnalyticsData = (userId: string) =>
    unstable_cache(
        () => fetchAnalytics(userId),
        ["analytics", userId],
        { tags: [`analytics-${userId}`], revalidate: 60 }
    )();
