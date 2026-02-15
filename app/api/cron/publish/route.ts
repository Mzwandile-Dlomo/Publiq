import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadToYouTube } from "@/lib/youtube";

// This route should be protected, e.g., by a secret key in headers
// For MVP, we'll just check for a query param or header
// e.g. ?key=SECRET_CRON_KEY

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key !== process.env.CRON_SECRET) {
        // Allow local development without key or with a default
        if (process.env.NODE_ENV === "production") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        // 1. Find due content
        const now = new Date();
        const contentsToPublish = await prisma.content.findMany({
            where: {
                status: "scheduled",
                scheduledAt: {
                    lte: now,
                },
            },
            include: {
                user: {
                    include: {
                        socialAccounts: true
                    }
                }
            }
        });

        if (contentsToPublish.length === 0) {
            return NextResponse.json({ message: "No content to publish" });
        }

        const results = [];

        // 2. Publish each
        for (const content of contentsToPublish) {
            try {
                console.log(`Publishing content ${content.id}...`);
                // We need to re-use the uploadToYouTube logic but we need the user's tokens.
                // uploadToYouTube takes userId and finds the tokens.

                // Note: uploadToYouTube expects a session or just userId. 
                // In lib/youtube.ts, we query the DB for SocialAccount using userId.

                const youtubeVideo = await uploadToYouTube(
                    content.userId,
                    content.id,
                    content.videoUrl,
                    content.title,
                    content.description || ""
                );

                // Update success status
                await prisma.content.update({
                    where: { id: content.id },
                    data: { status: "published" },
                });

                await prisma.publication.updateMany({
                    where: { contentId: content.id, platform: "youtube" },
                    data: {
                        status: "success",
                        platformPostId: youtubeVideo.id,
                        publishedAt: new Date(),
                    },
                });

                results.push({ id: content.id, status: "success", videoId: youtubeVideo.id });

            } catch (error: any) {
                console.error(`Failed to publish content ${content.id}:`, error);

                // Update failure status
                await prisma.publication.updateMany({
                    where: { contentId: content.id, platform: "youtube" },
                    data: {
                        status: "failed",
                        errorMessage: error.message || "Unknown error",
                    },
                });

                results.push({ id: content.id, status: "failed", error: error.message });
            }
        }

        return NextResponse.json({ results });

    } catch (error) {
        console.error("Cron Job Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
