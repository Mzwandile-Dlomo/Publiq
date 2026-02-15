import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromYouTube } from "@/lib/youtube";

export async function DELETE(
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

    // Delete from YouTube for any successful publications
    for (const pub of content.publications) {
        if (pub.platform === "youtube" && pub.platformPostId) {
            try {
                await deleteFromYouTube(session.userId as string, pub.platformPostId);
            } catch (error) {
                console.error(`Failed to delete YouTube video ${pub.platformPostId}:`, error);
            }
        }
    }

    await prisma.content.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
