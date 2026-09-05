import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { SiteFooter } from "@/components/layout/site-footer";
import { CollaborationsClient } from "@/components/collaborations/collaborations-client";

export const metadata = {
    title: "Collaborations – Publiq",
};

export default async function CollaborationsPage() {
    const user = await getAuthenticatedUser();

    const collaborations = await prisma.collaboration.findMany({
        where: { creatorId: user.id },
        include: {
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
        },
        orderBy: { updatedAt: "desc" },
    });

    return (
        <div className="min-h-screen">
            <main className="mx-auto max-w-3xl px-6 py-16">
                <div className="mb-8">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Collaborations
                    </div>
                    <h1 className="font-display mt-3 text-4xl">
                        Your brand deals.
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Manage campaign invites and track your brand partnerships.
                    </p>
                </div>

                <CollaborationsClient
                    initialCollabs={collaborations as never}
                    profilePublic={user.profilePublic}
                    username={user.username}
                />

                <SiteFooter />
            </main>
        </div>
    );
}
