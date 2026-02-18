import { google } from "googleapis";
import { createOAuthClient } from "../google";
import { prisma } from "../prisma";
import { refreshYouTubeToken } from "../token-refresh";
import { Readable } from "stream";
import type { PlatformPublisher, PlatformStatsProvider, PlatformCommentsProvider, PlatformComment, VideoStats } from "./types";

function createAuthedClient(account: { accessToken: string; refreshToken: string | null; expiresAt: number | null }) {
    const client = createOAuthClient();
    client.setCredentials({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
        expiry_date: account.expiresAt ? account.expiresAt * 1000 : undefined,
    });

    client.on("tokens", async (tokens) => {
        const updateData: Record<string, unknown> = {};
        if (tokens.access_token) updateData.accessToken = tokens.access_token;
        if (tokens.refresh_token) updateData.refreshToken = tokens.refresh_token;
        if (tokens.expiry_date) updateData.expiresAt = Math.floor(tokens.expiry_date / 1000);

        if (Object.keys(updateData).length > 0) {
            await prisma.socialAccount.updateMany({
                where: { accessToken: account.accessToken, provider: "youtube" },
                data: updateData,
            });
        }
    });

    return client;
}

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

        const refreshed = await refreshYouTubeToken(socialAccount);
        const client = createAuthedClient(refreshed);
        const youtube = google.youtube({ version: "v3", auth: client });

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

        const refreshed = await refreshYouTubeToken(socialAccount);
        const client = createAuthedClient(refreshed);
        const youtube = google.youtube({ version: "v3", auth: client });

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

export const youtubeCommentsProvider: PlatformCommentsProvider = {
    platform: "youtube",

    async getComments(userId, postId) {
        const socialAccount = await prisma.socialAccount.findFirst({
            where: { userId, provider: "youtube" },
        });

        if (!socialAccount) return [];

        const refreshed = await refreshYouTubeToken(socialAccount);
        const client = createAuthedClient(refreshed);
        const youtube = google.youtube({ version: "v3", auth: client });

        try {
            const res = await youtube.commentThreads.list({
                part: ["snippet", "replies"],
                videoId: postId,
                maxResults: 50,
                order: "relevance",
            });

            return (res.data.items || []).map((thread): PlatformComment => {
                const top = thread.snippet!.topLevelComment!.snippet!;
                return {
                    id: thread.id!,
                    authorName: top.authorDisplayName || "Unknown",
                    authorAvatar: top.authorProfileImageUrl || undefined,
                    text: top.textDisplay || "",
                    timestamp: top.publishedAt || new Date().toISOString(),
                    likeCount: top.likeCount || 0,
                    replies: thread.replies?.comments?.map((r): PlatformComment => ({
                        id: r.id!,
                        authorName: r.snippet!.authorDisplayName || "Unknown",
                        authorAvatar: r.snippet!.authorProfileImageUrl || undefined,
                        text: r.snippet!.textDisplay || "",
                        timestamp: r.snippet!.publishedAt || new Date().toISOString(),
                        likeCount: r.snippet!.likeCount || 0,
                    })),
                };
            });
        } catch {
            return [];
        }
    },
};
