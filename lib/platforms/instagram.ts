import { publishInstagramReel, publishInstagramImage } from "@/lib/meta";
import { prisma } from "@/lib/prisma";
import type { PlatformPublisher, PlatformStatsProvider, PlatformCommentsProvider, PlatformComment } from "./types";

export const instagramPublisher: PlatformPublisher = {
    platform: "instagram",

    async publish(userId, content) {
        const account = content.socialAccountId
            ? await prisma.socialAccount.findFirst({
                where: { id: content.socialAccountId, userId, provider: "instagram" },
            })
            : await prisma.socialAccount.findFirst({
                where: { userId, provider: "instagram", isDefault: true },
            }) || await prisma.socialAccount.findFirst({
                where: { userId, provider: "instagram" },
            });

        if (!account) throw new Error("No Instagram Business account connected");

        const caption = content.description || content.title;

        const result = content.mediaType === "image"
            ? await publishInstagramImage(account.accessToken, account.providerId, content.mediaUrl, caption)
            : await publishInstagramReel(account.accessToken, account.providerId, content.mediaUrl, caption);

        return {
            platformPostId: result.id,
            publishedAt: new Date(),
        };
    },
};

export const instagramStatsProvider: PlatformStatsProvider = {
    platform: "instagram",

    async getStats(userId, posts) {
        const account = await prisma.socialAccount.findFirst({
            where: { userId, provider: "instagram" },
        });

        if (!account || posts.length === 0) return {};

        const statsMap: Record<string, import("./types").VideoStats> = {};

        await Promise.all(
            posts.map(async ({ postId }) => {
                try {
                    const url = `https://graph.facebook.com/v19.0/${postId}?fields=like_count,comments_count&access_token=${account.accessToken}`;
                    const response = await fetch(url);
                    const data = await response.json();

                    if (data.error) return;

                    // Fetch impressions (views) from insights endpoint
                    let views = 0;
                    try {
                        const insightsUrl = `https://graph.facebook.com/v19.0/${postId}/insights?metric=impressions&access_token=${account.accessToken}`;
                        const insightsRes = await fetch(insightsUrl);
                        const insightsData = await insightsRes.json();
                        if (!insightsData.error && insightsData.data?.[0]?.values?.[0]?.value) {
                            views = insightsData.data[0].values[0].value;
                        }
                    } catch {
                        // Impressions may not be available for all media types
                    }

                    statsMap[postId] = {
                        views,
                        likes: data.like_count || 0,
                        comments: data.comments_count || 0,
                    };
                } catch {
                    // Skip posts we can't fetch stats for
                }
            })
        );

        return statsMap;
    },
};

export const instagramCommentsProvider: PlatformCommentsProvider = {
    platform: "instagram",

    async getComments(userId, postId) {
        const account = await prisma.socialAccount.findFirst({
            where: { userId, provider: "instagram" },
        });

        if (!account) return [];

        try {
            const url = `https://graph.facebook.com/v19.0/${postId}/comments?fields=id,username,text,timestamp,like_count,replies{id,username,text,timestamp,like_count}&limit=50&access_token=${account.accessToken}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.error || !data.data) return [];

            return data.data.map((c: Record<string, unknown>): PlatformComment => ({
                id: c.id as string,
                authorName: (c.username as string) || "Unknown",
                text: (c.text as string) || "",
                timestamp: c.timestamp as string,
                likeCount: (c.like_count as number) || 0,
                replies: (c.replies as Record<string, unknown> | undefined)?.data
                    ? ((c.replies as Record<string, unknown>).data as Record<string, unknown>[]).map(
                        (r: Record<string, unknown>): PlatformComment => ({
                            id: r.id as string,
                            authorName: (r.username as string) || "Unknown",
                            text: (r.text as string) || "",
                            timestamp: r.timestamp as string,
                            likeCount: (r.like_count as number) || 0,
                        })
                    )
                    : undefined,
            }));
        } catch {
            return [];
        }
    },
};
