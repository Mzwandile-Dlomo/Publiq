import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCommentsProvider } from "@/lib/platforms/registry";
import type { Platform } from "@/lib/platforms";
import type { PlatformComment } from "@/lib/platforms/types";

export interface InboxEntry {
    publicationId: string;
    contentId: string;
    contentTitle: string;
    platform: Platform;
    platformPostId: string;
    socialAccountId: string | null;
    comments: PlatformComment[];
}

export async function GET() {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId as string;

    // Fetch all successfully published content for this user
    const publications = await prisma.publication.findMany({
        where: {
            content: { userId },
            status: "success",
            platformPostId: { not: null },
        },
        select: {
            id: true,
            contentId: true,
            platform: true,
            platformPostId: true,
            socialAccountId: true,
            content: { select: { title: true } },
        },
        orderBy: { content: { updatedAt: "desc" } },
    });

    const entries: InboxEntry[] = [];

    await Promise.all(
        publications.map(async (pub: typeof publications[number]) => {
            try {
                const provider = await getCommentsProvider(pub.platform as Platform);
                const comments = await provider.getComments(
                    userId,
                    pub.platformPostId!,
                    pub.socialAccountId
                );

                entries.push({
                    publicationId: pub.id,
                    contentId: pub.contentId,
                    contentTitle: pub.content.title,
                    platform: pub.platform as Platform,
                    platformPostId: pub.platformPostId!,
                    socialAccountId: pub.socialAccountId,
                    comments,
                });
            } catch {
                // Skip publications where comments can't be fetched
            }
        })
    );

    // Sort: entries with newest comments first, then by content
    entries.sort((a, b) => {
        const aLatest = a.comments[0]?.timestamp ?? "";
        const bLatest = b.comments[0]?.timestamp ?? "";
        return bLatest.localeCompare(aLatest);
    });

    return NextResponse.json({ entries }, {
        headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
    });
}
