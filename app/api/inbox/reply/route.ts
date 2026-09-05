import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { refreshMetaToken } from "@/lib/token-refresh";
import { refreshTikTokToken } from "@/lib/token-refresh";
import { refreshYouTubeToken } from "@/lib/token-refresh";
import { replyToFacebookComment, replyToInstagramComment } from "@/lib/meta";
import { google } from "googleapis";
import { createOAuthClient } from "@/lib/google";
import type { Platform } from "@/lib/platforms";

const replySchema = z.object({
    platform: z.enum(["youtube", "tiktok", "instagram", "facebook"]),
    commentId: z.string().min(1),
    publicationId: z.string().min(1),
    message: z.string().min(1).max(2200),
    socialAccountId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId as string;

    try {
        const body = await req.json();
        const { platform, commentId, publicationId, message, socialAccountId } = replySchema.parse(body);

        // Verify the publication belongs to this user
        const publication = await prisma.publication.findFirst({
            where: { id: publicationId, content: { userId } },
        });

        if (!publication) {
            return NextResponse.json({ error: "Publication not found" }, { status: 404 });
        }

        let replyId: string;

        switch (platform as Platform) {
            case "youtube": {
                const account = await prisma.socialAccount.findFirst({
                    where: { userId, provider: "youtube" },
                });
                if (!account) throw new Error("No YouTube account connected");
                const refreshed = await refreshYouTubeToken(account);
                const client = createOAuthClient();
                client.setCredentials({
                    access_token: refreshed.accessToken,
                    refresh_token: refreshed.refreshToken,
                    expiry_date: refreshed.expiresAt ? refreshed.expiresAt * 1000 : undefined,
                });
                const youtube = google.youtube({ version: "v3", auth: client });
                const res = await youtube.comments.insert({
                    part: ["snippet"],
                    requestBody: {
                        snippet: {
                            parentId: commentId,
                            textOriginal: message,
                        },
                    },
                });
                replyId = res.data.id!;
                break;
            }

            case "facebook": {
                const accounts = await prisma.socialAccount.findMany({
                    where: { userId, provider: "facebook" },
                });
                if (accounts.length === 0) throw new Error("No Facebook account connected");
                const account = socialAccountId
                    ? accounts.find((a: typeof accounts[number]) => a.id === socialAccountId) || accounts.find((a: typeof accounts[number]) => a.isDefault) || accounts[0]
                    : accounts.find((a: typeof accounts[number]) => a.isDefault) || accounts[0];
                const refreshed = await refreshMetaToken(account);
                const result = await replyToFacebookComment(refreshed.accessToken, commentId, message);
                replyId = result.id;
                break;
            }

            case "instagram": {
                const account = await prisma.socialAccount.findFirst({
                    where: { userId, provider: "instagram" },
                });
                if (!account) throw new Error("No Instagram account connected");
                const refreshed = await refreshMetaToken(account);
                const result = await replyToInstagramComment(refreshed.accessToken, commentId, message);
                replyId = result.id;
                break;
            }

            case "tiktok": {
                const account = await prisma.socialAccount.findFirst({
                    where: { userId, provider: "tiktok" },
                });
                if (!account) throw new Error("No TikTok account connected");
                const refreshed = await refreshTikTokToken(account);

                // TikTok comment reply endpoint
                const res = await fetch(
                    "https://open.tiktokapis.com/v2/video/comment/reply/create/",
                    {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${refreshed.accessToken}`,
                            "Content-Type": "application/json; charset=UTF-8",
                        },
                        body: JSON.stringify({
                            video_id: publication.platformPostId,
                            parent_comment_id: commentId,
                            text: message,
                        }),
                    }
                );
                const data = await res.json();
                if (data.error?.code && data.error.code !== "ok") {
                    throw new Error(data.error.message || "TikTok reply failed");
                }
                replyId = data.data?.comment?.id || commentId;
                break;
            }

            default:
                return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
        }

        return NextResponse.json({ success: true, replyId });
    } catch (error) {
        console.error("Reply error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
