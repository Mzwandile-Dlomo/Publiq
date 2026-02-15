import { uploadToTikTok } from "@/lib/tiktok";
import { prisma } from "@/lib/prisma";
import type { PlatformPublisher, PlatformStatsProvider } from "./types";

export const tiktokPublisher: PlatformPublisher = {
    platform: "tiktok",

    async publish(userId, content) {
        // 1. Get Credentials
        const account = await prisma.socialAccount.findFirst({
            where: { userId, provider: "tiktok" }
        });

        if (!account) throw new Error("No TikTok account connected");

        // 2. Upload
        const result = await uploadToTikTok(
            account.accessToken,
            content.videoUrl,
            content.description || content.title
        );

        return {
            platformPostId: result.id,
            publishedAt: new Date(),
        };
    },
};

export const tiktokStatsProvider: PlatformStatsProvider = {
    platform: "tiktok",

    async getStats(_userId, _platformPostIds) {
        // TODO: Implement TikTok Video Insights API
        return {};
    },
};
