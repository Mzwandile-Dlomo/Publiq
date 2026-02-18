import { prisma } from "@/lib/prisma";
import { ContentList } from "@/components/content/content-list";
import { ContentNav } from "@/components/content/content-nav";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/lib/auth-user";

export default async function ContentPage({
    searchParams,
}: {
    searchParams: Promise<{ filter?: string }>;
}) {
    const user = await getAuthenticatedUser();
    const { filter } = await searchParams;

    type PublicationRaw = {
        id: string;
        platform: string;
        status: string;
        platformPostId: string | null;
        views: number | null;
        likes: number | null;
        comments: number | null;
    };

    type ContentItemRaw = {
        id: string;
        title: string;
        description: string | null;
        mediaUrl: string;
        mediaType: string;
        status: string;
        scheduledAt: Date | null;
        createdAt: Date;
        publications: PublicationRaw[];
    };

    const items = await prisma.content.findMany({
        where: { userId: user.id },
        include: { publications: true },
        orderBy: { createdAt: "desc" },
    });

    const serialized = (items as ContentItemRaw[]).map((item: ContentItemRaw) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        mediaUrl: item.mediaUrl,
        mediaType: item.mediaType,
        status: item.status,
        scheduledAt: item.scheduledAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        publications: item.publications.map((pub: PublicationRaw) => ({
            id: pub.id,
            platform: pub.platform,
            status: pub.status,
            platformPostId: pub.platformPostId,
            views: pub.views ?? 0,
            likes: pub.likes ?? 0,
            comments: pub.comments ?? 0,
        })),
    }));

    return (
        <div className="min-h-screen">
            <ContentNav />
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="text-center">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Content
                    </div>
                    <h1 className="font-display mt-3 text-4xl">
                        Manage your library.
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Browse, edit, and delete your drafts, scheduled, and published content.
                    </p>
                    <div className="mt-6">
                        <Link href="/upload">
                            <Button className="rounded-full">Upload content</Button>
                        </Link>
                    </div>
                </div>

                <div className="mt-12">
                    <ContentList items={serialized} initialFilter={filter} />
                </div>
            </div>
        </div>
    );
}
