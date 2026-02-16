import { uploadToTikTok } from "@/lib/tiktok";
import { prisma } from "@/lib/prisma";
import type { PlatformPublisher, PlatformStatsProvider } from "./types";

export const tiktokPublisher: PlatformPublisher = {
    platform: "tiktok",

    async publish(userId, content) {
        if (content.mediaType === "image") {
            throw new Error("TikTok does not support image posts");
        }

        const account = await prisma.socialAccount.findFirst({
            where: { userId, provider: "tiktok" }
        });

        if (!account) throw new Error("No TikTok account connected");

        const result = await uploadToTikTok(
            account.accessToken,
            content.mediaUrl,
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

    async getStats() {
        // TODO: Implement TikTok Video Insights API
        return {};
    },
};
