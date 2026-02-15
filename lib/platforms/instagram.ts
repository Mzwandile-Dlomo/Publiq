import { publishInstagramReel } from "@/lib/meta";
import { prisma } from "@/lib/prisma";
import type { PlatformPublisher, PlatformStatsProvider } from "./types";

export const instagramPublisher: PlatformPublisher = {
    platform: "instagram",

    async publish(userId, content) {
        // 1. Get Credentials
        const account = await prisma.socialAccount.findFirst({
            where: { userId, provider: "instagram" }
        });

        if (!account) throw new Error("No Instagram Business account connected");

        // 2. Publish
        const result = await publishInstagramReel(
            account.accessToken, // Page Token (with IG perms)
            account.providerId,  // IG Business User ID
            content.videoUrl,
            content.description || content.title
        );

        return {
            platformPostId: result.id,
            publishedAt: new Date(),
        };
    },
};

export const instagramStatsProvider: PlatformStatsProvider = {
    platform: "instagram",

    async getStats(_userId, _platformPostIds) {
        // TODO: Implement Instagram Insights API
        return {};
    },
};