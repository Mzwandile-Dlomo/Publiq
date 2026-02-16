import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentList } from "@/components/content/content-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ContentPage() {
    const session = await verifySession();

    if (!session) {
        redirect("/auth/login");
    }

    const items = await prisma.content.findMany({
        where: { userId: session.userId as string },
        include: { publications: true },
        orderBy: { createdAt: "desc" },
    });

    const serialized = items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        mediaUrl: item.mediaUrl,
        mediaType: item.mediaType,
        status: item.status,
        scheduledAt: item.scheduledAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        publications: item.publications.map((pub) => ({
            id: pub.id,
            platform: pub.platform,
            status: pub.status,
            platformPostId: pub.platformPostId,
        })),
    }));

    return (
        <div className="min-h-screen">
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
                            <Button className="rounded-full">Upload new content</Button>
                        </Link>
                    </div>
                </div>

                <div className="mt-12">
                    <ContentList items={serialized} />
                </div>
            </div>
        </div>
    );
}
