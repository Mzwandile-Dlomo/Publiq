import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublisher } from "@/lib/platforms/registry";
import { platformConfigs, type Platform } from "@/lib/platforms";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key !== process.env.CRON_SECRET) {
        if (process.env.NODE_ENV === "production") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const now = new Date();
        const contentsToPublish = await prisma.content.findMany({
            where: {
                status: "scheduled",
                scheduledAt: { lte: now },
            },
            include: {
                publications: true,
            },
        });

        if (contentsToPublish.length === 0) {
            return NextResponse.json({ message: "No content to publish" });
        }

        const results = [];

        for (const content of contentsToPublish) {
            const pendingPubs = content.publications.filter((p: { status: string }) => p.status === "pending");

            for (const publication of pendingPubs) {
                const platform = publication.platform as Platform;
                const config = platformConfigs[platform];

                if (!config?.available) {
                    await prisma.publication.update({
                        where: { id: publication.id },
                        data: {
                            status: "failed",
                            errorMessage: `${config?.name || platform} is not yet available`,
                        },
                    });
                    results.push({ contentId: content.id, platform, status: "failed" });
                    continue;
                }

                try {
                    const publisher = getPublisher(platform);
                    const result = await publisher.publish(content.userId, {
                        id: content.id,
                        mediaUrl: content.mediaUrl,
                        mediaType: content.mediaType as "video" | "image",
                        title: content.title,
                        description: content.description,
                        socialAccountId: publication.socialAccountId,
                    });

                    await prisma.publication.update({
                        where: { id: publication.id },
                        data: {
                            status: "success",
                            platformPostId: result.platformPostId,
                            publishedAt: result.publishedAt,
                        },
                    });

                    results.push({ contentId: content.id, platform, status: "success", postId: result.platformPostId });
                } catch (error) {
                    console.error(`Cron: Failed to publish content ${content.id} to ${platform}:`, error);
                    const message = error instanceof Error ? error.message : "Unknown error";

                    await prisma.publication.update({
                        where: { id: publication.id },
                        data: {
                            status: "failed",
                            errorMessage: message,
                        },
                    });

                    results.push({ contentId: content.id, platform, status: "failed", error: message });
                }
            }

            // Update content status
            const contentPubs = await prisma.publication.findMany({
                where: { contentId: content.id },
            });
            const anySuccess = contentPubs.some((p: { status: string }) => p.status === "success");

            await prisma.content.update({
                where: { id: content.id },
                data: { status: anySuccess ? "published" : "draft" },
            });
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error("Cron Job Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
