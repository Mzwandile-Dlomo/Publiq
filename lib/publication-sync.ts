import { prisma } from "@/lib/prisma";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { getStatsProvider } from "@/lib/platforms/registry";

type PublicationToSync = {
    id: string;
    platform: string;
    platformPostId: string | null;
    socialAccountId?: string | null;
};

/**
 * Refreshes publication stats and retires records that a platform no longer
 * returns. A successful publish is not proof that a post is still public:
 * creators can delete or hide it directly on the platform later.
 */
export async function syncPublicationStats(
    userId: string,
    publications: PublicationToSync[]
) {
    const byPlatform = new Map<Platform, PublicationToSync[]>();

    for (const publication of publications) {
        const platform = publication.platform as Platform;
        if (!PLATFORMS.includes(platform) || !publication.platformPostId) continue;
        const entries = byPlatform.get(platform) ?? [];
        entries.push(publication);
        byPlatform.set(platform, entries);
    }

    const unavailableIds = await Promise.all(
        Array.from(byPlatform.entries()).map(async ([platform, entries]) => {
            try {
                const provider = await getStatsProvider(platform);
                const statsByPostId = await provider.getStats(
                    userId,
                    entries.map((entry) => ({
                        postId: entry.platformPostId!,
                        socialAccountId: entry.socialAccountId,
                    }))
                );

                await prisma.$transaction(
                    entries.map((entry) => {
                        const stats = statsByPostId[entry.platformPostId!];

                        return prisma.publication.update({
                            where: { id: entry.id },
                            data: stats
                                ? {
                                      views: stats.views,
                                      likes: stats.likes,
                                      comments: stats.comments,
                                  }
                                : {
                                      // The platform answered successfully but did not return
                                      // this post, so do not keep advertising a dead link.
                                      status: "unavailable",
                                      views: 0,
                                      likes: 0,
                                      comments: 0,
                                  },
                        });
                    })
                );

                return entries
                    .filter((entry) => !statsByPostId[entry.platformPostId!])
                    .map((entry) => entry.id);
            } catch (error) {
                // A failed refresh must not make previously published posts disappear.
                console.error(`${platform} publication sync failed:`, error);
                return [];
            }
        })
    );

    return new Set(unavailableIds.flat());
}
