import { cache } from "react";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns the authenticated user or redirects to login.
 * Deduplicated per request via React cache().
 */
export const getAuthenticatedUser = cache(async () => {
    const session = await verifySession();
    if (!session) {
        redirect("/auth/login");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId as string },
        include: { socialAccounts: true, subscription: true },
    });

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

    return prisma.user.findUnique({
        where: { id: session.userId as string },
    });
});
