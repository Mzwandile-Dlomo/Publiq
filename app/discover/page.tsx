import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { DiscoverClient } from "@/components/discover/discover-client";

export const metadata = {
    title: "Discover Creators – Publiq",
    description: "Find and connect with top creators across YouTube, TikTok, Instagram and more.",
};

export default function DiscoverPage() {
    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="mx-auto max-w-6xl px-6 py-16">
                <div className="text-center">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Discover
                    </div>
                    <h1 className="font-display mt-3 text-4xl">
                        Find your next creator.
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Browse creators by niche and connect for brand collaborations.
                    </p>
                </div>

                <div className="mt-12">
                    <DiscoverClient />
                </div>

                <SiteFooter />
            </main>
        </div>
    );
}
