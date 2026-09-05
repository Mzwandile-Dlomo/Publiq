import { getAuthenticatedUser } from "@/lib/auth-user";
import { getCreatorCollaborations } from "@/lib/collaborations";
import { SiteFooter } from "@/components/layout/site-footer";
import { CollaborationsClient } from "@/components/collaborations/collaborations-client";

export const metadata = {
    title: "Collaborations – Publiq",
};

export default async function CollaborationsPage() {
    const user = await getAuthenticatedUser();

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
