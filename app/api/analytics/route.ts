import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { getStatsProvider } from "@/lib/platforms/registry";
import type { AnalyticsResponse, PlatformStats, TopContentItem, TrendDataPoint } from "@/lib/analytics-types";

function parseDateParam(value: string | null, fallback: Date): Date {
    if (!value) return fallback;
    const d = new Date(value);
    return isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: Request) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.userId as string;
        const { searchParams } = new URL(req.url);

        const to = parseDateParam(searchParams.get("to"), new Date());
        const from = parseDateParam(
            searchParams.get("from"),
            new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
        );
        const exportFormat = searchParams.get("export"); // "csv" | null

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

        // Get connected platforms
        const socialAccounts: SocialAccountProvider[] = await prisma.socialAccount.findMany({
            where: { userId },
            select: { provider: true },
        });
        const connectedPlatforms = socialAccounts.map((a: SocialAccountProvider) => a.provider);

        if (connectedPlatforms.length === 0) {
            const response: AnalyticsResponse = {
                totals: { views: 0, likes: 0, comments: 0 },
                platforms: {},
                topContent: [],
                trend: [],
            };
            return NextResponse.json(response);
        }

        // Fetch all successful publications for connected platforms only
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

        // Group post IDs by platform
        const postIdsByPlatform = new Map<Platform, { pubId: string; postId: string; socialAccountId: string | null }[]>();
        for (const pub of publications) {
            const platform = pub.platform as Platform;
            if (!PLATFORMS.includes(platform)) continue;
            if (!pub.platformPostId) continue;

            const list = postIdsByPlatform.get(platform) || [];
            list.push({ pubId: pub.id, postId: pub.platformPostId, socialAccountId: pub.socialAccountId });
            postIdsByPlatform.set(platform, list);
        }

        // Fetch stats from all platforms in parallel
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
                views: v,
                likes: l,
                comments: c,
                publicationCount: group._count,
            };
            totals.views += v;
            totals.likes += l;
            totals.comments += c;
        }

        // Top 5 performing publications by views
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

        // Daily trend within date range
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

        // CSV export
        if (exportFormat === "csv") {
            const rows = [
                ["Date", "Views", "Likes", "Comments"],
                ...trend.map((d) => [d.date, d.views, d.likes, d.comments]),
            ];
            const csv = rows.map((r) => r.join(",")).join("\n");
            return new Response(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="analytics-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`,
                },
            });
        }

        const response: AnalyticsResponse = { totals, platforms, topContent, trend };
        return NextResponse.json(response, {
            headers: {
                "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
            },
        });
    } catch (error) {
        console.error("Analytics Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
