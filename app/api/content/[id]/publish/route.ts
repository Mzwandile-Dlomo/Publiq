import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPublisher } from "@/lib/platforms/registry";
import { platformConfigs, type Platform } from "@/lib/platforms";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const content = await prisma.content.findUnique({
        where: { id, userId: session.userId as string },
        include: { publications: true },
    });

    if (!content) {
        return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Get all pending publications for this content
    const pendingPublications = content.publications.filter(
        (p) => p.status === "pending"
    );

    if (pendingPublications.length === 0) {
        return NextResponse.json({ error: "No pending publications" }, { status: 400 });
    }

    const results = [];

    for (const publication of pendingPublications) {
        const platform = publication.platform as Platform;
        const config = platformConfigs[platform];

        // Skip unavailable platforms
        if (!config?.available) {
            await prisma.publication.update({
                where: { id: publication.id },
                data: {
                    status: "failed",
                    errorMessage: `${config?.name || platform} is not yet available`,
                },
            });
            results.push({ platform, status: "failed", error: `${config?.name || platform} not yet available` });
            continue;
        }

        try {
            const publisher = getPublisher(platform);
            const result = await publisher.publish(session.userId as string, {
                id: content.id,
                videoUrl: content.videoUrl,
                title: content.title,
                description: content.description,
            });

            await prisma.publication.update({
                where: { id: publication.id },
                data: {
                    status: "success",
                    platformPostId: result.platformPostId,
                    publishedAt: result.publishedAt,
                },
            });

            results.push({ platform, status: "success", postId: result.platformPostId });
        } catch (error: any) {
            console.error(`Publishing to ${platform} failed:`, error);

            await prisma.publication.update({
                where: { id: publication.id },
                data: {
                    status: "failed",
                    errorMessage: error.message || "Unknown error",
                },
            });

            results.push({ platform, status: "failed", error: error.message });
        }
    }

    // Update content status based on results
    const allSucceeded = results.every((r) => r.status === "success");
    const anySucceeded = results.some((r) => r.status === "success");

    await prisma.content.update({
        where: { id },
        data: {
            status: allSucceeded ? "published" : anySucceeded ? "published" : "draft",
        },
    });

    return NextResponse.json({ results });
}
