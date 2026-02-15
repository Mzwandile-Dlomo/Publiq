import { publishFacebookVideo } from "@/lib/meta";
import { prisma } from "@/lib/prisma";
import type { PlatformPublisher, PlatformStatsProvider } from "./types";

export const facebookPublisher: PlatformPublisher = {
    platform: "facebook",

    async publish(userId, content) {
        // 1. Get Credentials (find the connected Facebook Page)
        const account = await prisma.socialAccount.findFirst({
            where: { userId, provider: "facebook" }
        });

        if (!account) throw new Error("No Facebook Page connected");

        // 2. Publish
        const result = await publishFacebookVideo(
            account.accessToken, // Page Token
            account.providerId,  // Page ID
            content.videoUrl,
            content.description || content.title
        );

        return {
            platformPostId: result.id,
            publishedAt: new Date(),
        };
    },
};

export const facebookStatsProvider: PlatformStatsProvider = {
    platform: "facebook",

    async getStats(_userId, _platformPostIds) {
        // TODO: Implement Facebook Video Insights API
        return {};
    },
};
