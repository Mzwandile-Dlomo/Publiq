import { google } from "googleapis";
import { createOAuthClient } from "./google";
import { prisma } from "./prisma";
import { refreshYouTubeToken } from "./token-refresh";
import { Readable } from "stream";

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

export async function deleteFromYouTube(userId: string, videoId: string) {
    const socialAccount = await prisma.socialAccount.findFirst({
        where: { userId, provider: "youtube" },
    });

    if (!socialAccount) {
        throw new Error("No YouTube account connected");
    }

    const refreshed = await refreshYouTubeToken(socialAccount);
    const client = createAuthedClient(refreshed);
    const youtube = google.youtube({ version: "v3", auth: client });

    await youtube.videos.delete({ id: videoId });
}

export async function getYouTubeVideoStats(
    userId: string,
    videoIds: string[]
): Promise<Record<string, { views: number; likes: number; comments: number }>> {
    const socialAccount = await prisma.socialAccount.findFirst({
        where: {
            userId,
            provider: "youtube",
        },
    });

    if (!socialAccount) {
        throw new Error("No YouTube account connected");
    }

    const refreshed = await refreshYouTubeToken(socialAccount);
    const client = createAuthedClient(refreshed);
    const youtube = google.youtube({ version: "v3", auth: client });

    const res = await youtube.videos.list({
        part: ["statistics"],
        id: videoIds,
    });

    const statsMap: Record<string, { views: number; likes: number; comments: number }> = {};

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
}

export async function uploadToYouTube(
    userId: string,
    contentId: string,
    fileUrl: string,
    title: string,
    description: string
) {
    // 1. Get User's YouTube Credentials
    const socialAccount = await prisma.socialAccount.findFirst({
        where: {
            userId,
            provider: "youtube",
        },
    });

    if (!socialAccount) {
        throw new Error("No YouTube account connected");
    }

    // 2. Refresh token if expired, then set credentials
    const refreshed = await refreshYouTubeToken(socialAccount);
    const client = createAuthedClient(refreshed);
    const youtube = google.youtube({ version: "v3", auth: client });

    // 3. Fetch the file stream
    const response = await fetch(fileUrl);
    if (!response.body) {
        throw new Error("Failed to fetch video file");
    }

    // Convert web stream to Node stream matches googleapis expectation
    // @ts-expect-error - Web ReadableStream vs Node stream type mismatch
    const fileStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);

    // 4. Upload to YouTube
    try {
        const res = await youtube.videos.insert({
            part: ["snippet", "status"],
            requestBody: {
                snippet: {
                    title,
                    description,
                },
                status: {
                    privacyStatus: "public",
                },
            },
            media: {
                body: fileStream,
            },
        });

        return res.data;
    } catch (error) {
        console.error("YouTube Upload Error:", error);
        throw error;
    }
}
