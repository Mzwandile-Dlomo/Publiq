import { uploadToTikTok } from "@/lib/tiktok";
import { prisma } from "@/lib/prisma";
import { refreshTikTokToken } from "@/lib/token-refresh";
import type { PlatformPublisher, PlatformStatsProvider, PlatformCommentsProvider, PlatformComment, VideoStats } from "./types";

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

        const refreshed = await refreshTikTokToken(account);

        const result = await uploadToTikTok(
            refreshed.accessToken,
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

    async getStats(userId, posts) {
        if (posts.length === 0) return {};

        const account = await prisma.socialAccount.findFirst({
            where: { userId, provider: "tiktok" },
        });

        if (!account) return {};

        const refreshed = await refreshTikTokToken(account);

        // TikTok Video Query API: https://developers.tiktok.com/doc/tiktok-api-v2-video-query/
        // Supports batch fetching video stats using the Content Posting API scope
        const postIds = posts.map((p) => p.postId);

        try {
            const url = "https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count";
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${refreshed.accessToken}`,
                    "Content-Type": "application/json; charset=UTF-8",
                },
                body: JSON.stringify({
                    filters: {
                        video_ids: postIds,
                    },
                }),
            });

            if (!res.ok) {
                console.error("TikTok stats fetch failed:", await res.text());
                return {};
            }

            const data = await res.json();

            if (data.error?.code && data.error.code !== "ok") {
                console.error("TikTok stats API error:", data.error.message);
                return {};
            }

            const statsMap: Record<string, VideoStats> = {};

            for (const video of data.data?.videos || []) {
                if (video.id) {
                    statsMap[video.id] = {
                        views: video.view_count || 0,
                        likes: video.like_count || 0,
                        comments: video.comment_count || 0,
                    };
                }
            }

            return statsMap;
        } catch (err) {
            console.error("TikTok stats error:", err);
            return {};
        }
    },
};

export const tiktokCommentsProvider: PlatformCommentsProvider = {
    platform: "tiktok",

    async getComments(userId, postId) {
        const account = await prisma.socialAccount.findFirst({
            where: { userId, provider: "tiktok" },
        });

        if (!account) return [];

        const refreshed = await refreshTikTokToken(account);

        try {
            // TikTok Comment List API: https://developers.tiktok.com/doc/tiktok-api-v2-video-comment-list/
            const url = `https://open.tiktokapis.com/v2/video/comment/list/?fields=id,text,like_count,create_time,user`;
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${refreshed.accessToken}`,
                    "Content-Type": "application/json; charset=UTF-8",
                },
                body: JSON.stringify({
                    video_id: postId,
                    max_count: 50,
                }),
            });

            if (!res.ok) return [];

            const data = await res.json();

            if (data.error?.code && data.error.code !== "ok") return [];
            if (!data.data?.comments) return [];

            // Fetch replies for each top-level comment in parallel
            const comments: PlatformComment[] = await Promise.all(
                data.data.comments.map(async (c: Record<string, unknown>): Promise<PlatformComment> => {
                    const user = c.user as Record<string, string> | undefined;
                    let replies: PlatformComment[] | undefined;

                    // Fetch replies if the comment has any
                    const replyCount = (c.reply_count as number) || 0;
                    if (replyCount > 0) {
                        try {
                            const replyRes = await fetch(
                                `https://open.tiktokapis.com/v2/video/comment/reply/list/?fields=id,text,like_count,create_time,user`,
                                {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Bearer ${refreshed.accessToken}`,
                                        "Content-Type": "application/json; charset=UTF-8",
                                    },
                                    body: JSON.stringify({
                                        video_id: postId,
                                        comment_id: c.id,
                                        max_count: 20,
                                    }),
                                }
                            );
                            if (replyRes.ok) {
                                const replyData = await replyRes.json();
                                if (replyData.data?.replies) {
                                    replies = replyData.data.replies.map((r: Record<string, unknown>): PlatformComment => {
                                        const rUser = r.user as Record<string, string> | undefined;
                                        return {
                                            id: r.id as string,
                                            authorName: rUser?.display_name || rUser?.unique_id || "Unknown",
                                            authorAvatar: rUser?.avatar_url,
                                            text: (r.text as string) || "",
                                            timestamp: new Date((r.create_time as number) * 1000).toISOString(),
                                            likeCount: (r.like_count as number) || 0,
                                        };
                                    });
                                }
                            }
                        } catch {
                            // Replies not available — skip
                        }
                    }

                    return {
                        id: c.id as string,
                        authorName: user?.display_name || user?.unique_id || "Unknown",
                        authorAvatar: user?.avatar_url,
                        text: (c.text as string) || "",
                        timestamp: new Date((c.create_time as number) * 1000).toISOString(),
                        likeCount: (c.like_count as number) || 0,
                        replies,
                    };
                })
            );

            return comments;
        } catch (err) {
            console.error("TikTok comments error:", err);
            return [];
        }
    },
};
