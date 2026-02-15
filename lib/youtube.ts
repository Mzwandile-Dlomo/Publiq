import { google } from "googleapis";
import { oauth2Client } from "./google";
import { prisma } from "./prisma";
import { Readable } from "stream";

export async function deleteFromYouTube(userId: string, videoId: string) {
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

    oauth2Client.setCredentials({
        access_token: socialAccount.accessToken,
        refresh_token: socialAccount.refreshToken,
        expiry_date: socialAccount.expiresAt ? socialAccount.expiresAt * 1000 : undefined,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

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

    // 2. Set Credentials & Refresh if needed
    oauth2Client.setCredentials({
        access_token: socialAccount.accessToken,
        refresh_token: socialAccount.refreshToken,
        expiry_date: socialAccount.expiresAt ? socialAccount.expiresAt * 1000 : undefined,
    });

    // Check if token needs refresh (handled by googleapis mostly, but we should handle the update callback if we want to store new tokens)
    // Actually, googleapis auto-refreshes if refresh_token is present.
    // We should listen to 'tokens' event to save new tokens, or just let it handle it in memory for this request.
    // For robustness, we should manually check or check if googleapis provides a way to get refreshed tokens back.

    // A simple way is to force refresh if expired, but let's try standard usage first.

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    // 3. Fetch the file stream
    const response = await fetch(fileUrl);
    if (!response.body) {
        throw new Error("Failed to fetch video file");
    }

    // Convert web stream to Node stream matches googleapis expectation
    // @ts-ignore - Web streams and Node streams are slightly different types but often compatible in recent Node versions
    // or we can use generic stream conversion.
    const fileStream = Readable.fromWeb(response.body as any);

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
