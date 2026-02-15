import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToYouTube } from "@/lib/youtube";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> } // Params are promises in Next.js 15+ (and 14 in some configs, best to await)
) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 1. Fetch Content
    const content = await prisma.content.findUnique({
        where: { id, userId: session.userId as string },
    });

    if (!content) {
        return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // 2. Upload to YouTube
    try {
        const youtubeVideo = await uploadToYouTube(
            session.userId as string,
            content.id,
            content.videoUrl,
            content.title,
            content.description || ""
        );

        // 3. Update Status
        // Update Content status
        await prisma.content.update({
            where: { id },
            data: { status: "published" },
        });

        // Update Publication status (assuming we have one for youtube, or create if missing)
        // We created one in POST /api/content, so we update it.
        // We need to find the specific publication ID or update many.
        await prisma.publication.updateMany({
            where: { contentId: id, platform: "youtube" },
            data: {
                status: "success",
                platformPostId: youtubeVideo.id,
                publishedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true, videoId: youtubeVideo.id });
    } catch (error: any) {
        console.error("Publishing Error:", error);

        // Update Publication status to failed
        await prisma.publication.updateMany({
            where: { contentId: id, platform: "youtube" },
            data: {
                status: "failed",
                errorMessage: error.message || "Unknown error",
            },
        });

        return NextResponse.json({ error: "Failed to publish to YouTube" }, { status: 500 });
    }
}
