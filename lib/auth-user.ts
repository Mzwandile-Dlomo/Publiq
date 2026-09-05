import { cache } from "react";
import { redirect } from "next/navigation";
import { unstable_cache, revalidateTag } from "next/cache";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const fetchUserWithIncludes = (userId: string) =>
    unstable_cache(
        () =>
            prisma.user.findUnique({
                where: { id: userId },
                include: { socialAccounts: true, subscription: true },
            }),
        ["user", userId],
        { tags: [`user-${userId}`], revalidate: 60 }
    )();

const fetchUserBasic = (userId: string) =>
    unstable_cache(
        () =>
            prisma.user.findUnique({
                where: { id: userId },
            }),
        ["user-basic", userId],
        { tags: [`user-${userId}`], revalidate: 60 }
    )();

/**
 * Returns the authenticated user or redirects to login.
 * Cached across navigations via unstable_cache (60s TTL).
 * Deduplicated within a single request via React cache().
 */
export const getAuthenticatedUser = cache(async () => {
    const session = await verifySession();
    if (!session) {
        redirect("/auth/login");
    }

    const user = await fetchUserWithIncludes(session.userId as string);

    if (!user) {
        redirect("/auth/login");
    }

    return user;
});

/**
 * Returns the session user or null (no redirect). For navbar/optional contexts.
 */
export const getOptionalUser = cache(async () => {
    const session = await verifySession();
    if (!session) {
        return null;
    }

    return fetchUserBasic(session.userId as string);
});

/**
 * Busts the user cache. Call this in any API route that modifies
 * user data, social accounts, or subscriptions.
 */
export function revalidateUser(userId: string) {
    revalidateTag(`user-${userId}`, "max");
}
