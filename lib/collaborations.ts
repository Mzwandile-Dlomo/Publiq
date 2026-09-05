import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

const campaignInclude = {
    campaign: {
        select: {
            id: true,
            title: true,
            description: true,
            budget: true,
            currency: true,
            deadline: true,
            status: true,
            brand: { select: { id: true, name: true, image: true } },
        },
    },
    content: { select: { id: true, title: true, thumbnailUrl: true } },
} as const;

/**
 * Collaborations for a creator, newest activity first.
 * Cached across navigations via unstable_cache (60s TTL).
 */
export const getCreatorCollaborations = (creatorId: string) =>
    unstable_cache(
        () =>
            prisma.collaboration.findMany({
                where: { creatorId },
                include: campaignInclude,
                orderBy: { updatedAt: "desc" },
            }),
        ["collaborations", creatorId],
        { tags: [`collaborations-${creatorId}`], revalidate: 60 }
    )();

/**
 * Busts the collaboration cache. Call this in any API route that creates
 * or updates a collaboration — including brand-side writes, which change
 * what the creator sees.
 */
export function revalidateCollaborations(creatorId: string) {
    revalidateTag(`collaborations-${creatorId}`, "max");
}
