import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCommentsProvider } from "@/lib/platforms/registry";
import type { Platform } from "@/lib/platforms";
import type { PlatformComment } from "@/lib/platforms/types";

export async function GET(
    _req: Request,
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
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const successfulPubs = content.publications.filter(
        (p) => p.status === "success" && p.platformPostId
    );

    const results: Record<string, { platform: string; comments: PlatformComment[] }> = {};

    await Promise.all(
        successfulPubs.map(async (pub) => {
            try {
                const provider = await getCommentsProvider(pub.platform as Platform);
                const comments = await provider.getComments(
                    session.userId as string,
                    pub.platformPostId!,
                    pub.socialAccountId
                );
                results[pub.id] = { platform: pub.platform, comments };
            } catch {
                results[pub.id] = { platform: pub.platform, comments: [] };
            }
        })
    );

    return NextResponse.json(results, {
        headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
    });
}
