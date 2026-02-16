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

        await Promise.all(
            platformPostIds.map(async (postId) => {
                try {
                    const url = `https://graph.facebook.com/v19.0/${postId}?fields=views,likes.summary(true),comments.summary(true)&access_token=${account.accessToken}`;
                    const response = await fetch(url);
                    const data = await response.json();

                    if (data.error) return;

                    statsMap[postId] = {
                        views: data.views || 0,
                        likes: data.likes?.summary?.total_count || 0,
                        comments: data.comments?.summary?.total_count || 0,
                    };
                } catch {
                    // Skip posts we can't fetch stats for
                }
            })
        );

        return statsMap;
    },
};
