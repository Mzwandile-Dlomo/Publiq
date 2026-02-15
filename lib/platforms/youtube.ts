import { google } from "googleapis";
import { oauth2Client } from "../google";
import { prisma } from "../prisma";
import { Readable } from "stream";
import type { PlatformPublisher, PlatformStatsProvider, VideoStats } from "./types";

export const youtubePublisher: PlatformPublisher = {
    platform: "youtube",

    async publish(userId, content) {
        const socialAccount = await prisma.socialAccount.findFirst({
            where: { userId, provider: "youtube" },
        });

        if (!socialAccount) {
            throw new Error("No YouTube account connected");
        }

        oauth2Client.setCredentials({
            access_token: socialAccount.accessToken,
            refresh_token: socialAccount.refreshToken,
            expiry_date: socialAccount.expiresAt ? socialAccount.expiresAt * 1000 : undefined,
        });

        const youtube = google.youtube({ version: "v3", auth: oauth2Client });

        const response = await fetch(content.videoUrl);
        if (!response.body) {
            throw new Error("Failed to fetch video file");
        }

        const fileStream = Readable.fromWeb(response.body as any);

        const res = await youtube.videos.insert({
            part: ["snippet", "status"],
            requestBody: {
                snippet: {
                    title: content.title,
                    description: content.description || "",
                },
                status: {
                    privacyStatus: "public",
                },
            },
            media: {
                body: fileStream,
            },
        });

        return {
            platformPostId: res.data.id!,
            publishedAt: new Date(),
        };
    },
};

export const youtubeStatsProvider: PlatformStatsProvider = {
    platform: "youtube",

    async getStats(userId, platformPostIds) {
        const socialAccount = await prisma.socialAccount.findFirst({
            where: { userId, provider: "youtube" },
        });

        if (!socialAccount) {
            return {};
        }

        oauth2Client.setCredentials({
            access_token: socialAccount.accessToken,
            refresh_token: socialAccount.refreshToken,
            expiry_date: socialAccount.expiresAt ? socialAccount.expiresAt * 1000 : undefined,
        });

        const youtube = google.youtube({ version: "v3", auth: oauth2Client });

        const res = await youtube.videos.list({
            part: ["statistics"],
            id: platformPostIds,
        });

        const statsMap: Record<string, VideoStats> = {};

        for (const video of res.data.items || []) {
            if (video.id && video.statistics) {
                statsMap[video.id] = {
                    views: parseInt(video.statistics.viewCount || "0", 10),
                    likes: parseInt(video.statistics.likeCount || "0", 10),
                    comments: parseInt(video.statistics.commentCount || "0", 10),
                };
            }
        }

        return statsMap;
    },
};
