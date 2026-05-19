import { getAuthenticatedUser } from "@/lib/auth-user";
import { SiteFooter } from "@/components/layout/site-footer";
import { AiIdeasPanel } from "@/components/ai/ai-ideas-panel";

export const metadata = {
    title: "Content Ideas – Publiq",
    description: "AI-powered content ideas tailored to your niches.",
};

export default async function IdeasPage() {
    const user = await getAuthenticatedUser();
    const niches = (user as { niches?: string[] }).niches ?? [];

    return (
        <div className="min-h-screen">
            <main className="mx-auto max-w-4xl px-6 py-16">
                <div className="mb-8">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        AI Tools
                    </div>
                    <h1 className="font-display mt-3 text-4xl">
                        Content Ideas.
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Generate fresh content ideas tailored to your niches and platform.
                    </p>
                </div>

                <AiIdeasPanel userNiches={niches} />

                <SiteFooter />
            </main>
        </div>
    );
}
