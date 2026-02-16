import { google } from "googleapis";
import { oauth2Client } from "../google";
import { prisma } from "../prisma";
import { Readable } from "stream";
import type { PlatformPublisher, PlatformStatsProvider, VideoStats } from "./types";

export const youtubePublisher: PlatformPublisher = {
    platform: "youtube",

    async publish(userId, content) {
        if (content.mediaType === "image") {
            throw new Error("YouTube does not support image posts");
        }

        const socialAccount = content.socialAccountId
            ? await prisma.socialAccount.findFirst({
                where: { id: content.socialAccountId, userId, provider: "youtube" },
            })
            : await prisma.socialAccount.findFirst({
                where: { userId, provider: "youtube", isDefault: true },
            }) || await prisma.socialAccount.findFirst({
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

        const response = await fetch(content.mediaUrl);
        if (!response.body) {
            throw new Error("Failed to fetch video file");
        }

        // @ts-expect-error - Web ReadableStream vs Node stream type mismatch
        const fileStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);

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

    async getStats(userId, posts) {
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

        const postIds = posts.map((p) => p.postId);
        const res = await youtube.videos.list({
            part: ["statistics"],
            id: postIds,
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
