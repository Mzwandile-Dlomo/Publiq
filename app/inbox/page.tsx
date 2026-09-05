import { Suspense } from "react";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { getCommentsProvider } from "@/lib/platforms/registry";
import { prisma } from "@/lib/prisma";
import { InboxClient } from "@/components/inbox/inbox-client";
import type { Platform } from "@/lib/platforms";
import type { InboxEntry } from "@/app/api/inbox/route";

async function InboxContent() {
    const user = await getAuthenticatedUser();

    const publications = await prisma.publication.findMany({
        where: {
            content: { userId: user.id },
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
                    user.id,
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

    // Sort entries: those with most-recent comments first
    entries.sort((a, b) => {
        const aLatest = a.comments[0]?.timestamp ?? "";
        const bLatest = b.comments[0]?.timestamp ?? "";
        return bLatest.localeCompare(aLatest);
    });

    return <InboxClient entries={entries} />;
}

function InboxLoadingSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted" />
            ))}
        </div>
    );
}

export default function InboxPage() {
    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-3xl px-6 py-8">
                <div className="text-center">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Inbox
                    </div>
                    <h1 className="font-display mt-3 text-4xl">
                        All your comments.
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Read and reply to comments from every platform in one place.
                    </p>
                </div>

                <div className="mt-10">
                    <Suspense fallback={<InboxLoadingSkeleton />}>
                        <InboxContent />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
