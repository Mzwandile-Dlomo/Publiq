import { publishFacebookVideo, publishFacebookPhoto } from "@/lib/meta";
import { prisma } from "@/lib/prisma";
import type { PlatformPublisher, PlatformStatsProvider } from "./types";

export const facebookPublisher: PlatformPublisher = {
    platform: "facebook",

    async publish(userId, content) {
        const account = await prisma.socialAccount.findFirst({
            where: { userId, provider: "facebook" }
        });

        if (!account) throw new Error("No Facebook Page connected");

        const caption = content.description || content.title;

        const result = content.mediaType === "image"
            ? await publishFacebookPhoto(account.accessToken, account.providerId, content.mediaUrl, caption)
            : await publishFacebookVideo(account.accessToken, account.providerId, content.mediaUrl, caption);

        return {
            platformPostId: result.id,
            publishedAt: new Date(),
        };
    },
};

export const facebookStatsProvider: PlatformStatsProvider = {
    platform: "facebook",

    async getStats(userId, platformPostIds) {
        const account = await prisma.socialAccount.findFirst({
            where: { userId, provider: "facebook" },
        });

        if (!account || platformPostIds.length === 0) return {};

        const statsMap: Record<string, import("./types").VideoStats> = {};
        const pageId = account.providerId;

        await Promise.all(
            platformPostIds.map(async (postId) => {
                try {
                    // Determine the queryable ID — if it's a raw object ID (no underscore),
                    // construct the page post ID format: {pageId}_{objectId}
                    const queryId = postId.includes("_")
                        ? postId
                        : `${pageId}_${postId}`;

                    // Reactions work with pages_read_engagement (no extra perms needed)
                    let likes = 0;
                    try {
                        const reactionsUrl = `https://graph.facebook.com/v21.0/${queryId}/reactions?summary=total_count&access_token=${account.accessToken}`;
                        const reactionsRes = await fetch(reactionsUrl);
                        const reactionsData = await reactionsRes.json();
                        if (!reactionsData.error) {
                            likes = reactionsData.summary?.total_count || 0;
                        }
                    } catch {
                        // Reactions not available
                    }

                    // Comments require pages_read_user_content permission
                    let comments = 0;
                    try {
                        const commentsUrl = `https://graph.facebook.com/v21.0/${queryId}/comments?summary=true&access_token=${account.accessToken}`;
                        const commentsRes = await fetch(commentsUrl);
                        const commentsData = await commentsRes.json();
                        if (!commentsData.error) {
                            comments = commentsData.summary?.total_count || 0;
                        }
                    } catch {
                        // Comments not available
                    }

                    // Video views (only works for video posts, requires read_insights)
                    let views = 0;
                    try {
                        const insightsUrl = `https://graph.facebook.com/v21.0/${queryId}/insights?metric=post_impressions&access_token=${account.accessToken}`;
                        const insightsRes = await fetch(insightsUrl);
                        const insightsData = await insightsRes.json();
                        if (!insightsData.error && insightsData.data?.[0]) {
                            views = insightsData.data[0].values?.[0]?.value || 0;
                        }
                    } catch {
                        // Insights not available
                    }

                    statsMap[postId] = { views, likes, comments };
                } catch {
                    // Skip posts we can't fetch stats for
                }
            })
        );

        return statsMap;
    },
};
