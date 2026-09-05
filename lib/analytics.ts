import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { getStatsProvider } from "@/lib/platforms/registry";
import type { AnalyticsResponse, PlatformStats, TopContentItem, TrendDataPoint } from "@/lib/analytics-types";

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

export interface AnalyticsOptions {
    /** Start of date range (inclusive). Defaults to 30 days ago. */
    from?: Date;
    /** End of date range (inclusive). Defaults to now. */
    to?: Date;
}

async function fetchAnalytics(userId: string, options: AnalyticsOptions = {}): Promise<AnalyticsResponse> {
    const to = options.to ?? new Date();
    const from = options.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    const socialAccounts: SocialAccountProvider[] = await prisma.socialAccount.findMany({
        where: { userId },
        select: { provider: true },
    });
    const connectedPlatforms = socialAccounts.map((a: SocialAccountProvider) => a.provider);

    if (connectedPlatforms.length === 0) {
        return { totals: { views: 0, likes: 0, comments: 0 }, platforms: {}, topContent: [], trend: [] };
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

    // Per-platform breakdown (all time, for comparison bar)
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

    // Daily trend: published posts within the date range, accumulated by day
    const rangedPubs = await prisma.publication.findMany({
        where: {
            content: { userId },
            status: "success",
            platform: { in: connectedPlatforms },
            publishedAt: { gte: from, lte: to },
        },
        select: {
            publishedAt: true,
            views: true,
            likes: true,
            comments: true,
        },
        orderBy: { publishedAt: "asc" },
    });

    // Build a map of date -> aggregated stats
    const trendMap = new Map<string, TrendDataPoint>();

    for (const pub of rangedPubs) {
        if (!pub.publishedAt) continue;
        const date = pub.publishedAt.toISOString().slice(0, 10);
        const existing = trendMap.get(date) ?? { date, views: 0, likes: 0, comments: 0 };
        existing.views += pub.views ?? 0;
        existing.likes += pub.likes ?? 0;
        existing.comments += pub.comments ?? 0;
        trendMap.set(date, existing);
    }

    // Fill in zero-value days so the chart has a continuous axis
    const trend: TrendDataPoint[] = [];
    const cursor = new Date(from);
    cursor.setUTCHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setUTCHours(23, 59, 59, 999);

    while (cursor <= end) {
        const date = cursor.toISOString().slice(0, 10);
        trend.push(trendMap.get(date) ?? { date, views: 0, likes: 0, comments: 0 });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return { totals, platforms, topContent, trend };
}

export const getAnalyticsData = (userId: string, options: AnalyticsOptions = {}) => {
    const fromKey = options.from?.toISOString().slice(0, 10) ?? "default";
    const toKey = options.to?.toISOString().slice(0, 10) ?? "default";
    return unstable_cache(
        () => fetchAnalytics(userId, options),
        ["analytics", userId, fromKey, toKey],
        { tags: [`analytics-${userId}`], revalidate: 60 }
    )();
};
