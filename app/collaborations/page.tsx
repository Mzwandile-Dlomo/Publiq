import { getAuthenticatedUser } from "@/lib/auth-user";
import { getCreatorCollaborations } from "@/lib/collaborations";
import { prisma } from "@/lib/prisma";
import { SiteFooter } from "@/components/layout/site-footer";
import { CollaborationsClient } from "@/components/collaborations/collaborations-client";
import { BrandPartnershipsClient } from "@/components/collaborations/brand-partnerships-client";

export const metadata = {
    title: "Collaborations – Publiq",
};

export default async function CollaborationsPage() {
    const user = await getAuthenticatedUser();

    if (user.role === "brand") {
        const collaborations = await prisma.collaboration.findMany({
            where: { campaign: { brandId: user.id } },
            include: {
                campaign: { select: { id: true, title: true } },
                creator: { select: { name: true, image: true, username: true, niches: true } },
            },
            orderBy: { updatedAt: "desc" },
        });

        return (
            <div className="min-h-screen">
                <main className="mx-auto max-w-4xl px-6 py-16">
                    <div className="mb-8">
                        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Partnerships</div>
                        <h1 className="font-display mt-3 text-4xl">Your creator partnerships.</h1>
                        <p className="mt-4 text-lg text-muted-foreground">Review applications, approve submitted work, and track every campaign relationship.</p>
                    </div>
                    <BrandPartnershipsClient initialCollabs={collaborations as never} />
                    <SiteFooter />
                </main>
            </div>
        );
    }

    const collaborations = await getCreatorCollaborations(user.id);

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
