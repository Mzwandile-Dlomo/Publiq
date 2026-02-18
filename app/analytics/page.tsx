import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { getAnalyticsData } from "@/lib/analytics";

async function AnalyticsContent() {
    const user = await getAuthenticatedUser();
    const data = await getAnalyticsData(user.id);
    return <AnalyticsDashboard data={data} />;
}

function AnalyticsLoadingSkeleton() {
    return (
        <div className="space-y-10 animate-pulse">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl bg-muted" />
                ))}
            </div>
            <div className="h-64 rounded-2xl bg-muted" />
            <div className="h-48 rounded-2xl bg-muted" />
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="text-center">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Analytics
                    </div>
                    <h1 className="font-display mt-3 text-4xl">
                        Track your performance.
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        See how your content performs across all connected platforms.
                    </p>
                    <div className="mt-6">
                        <Link href="/upload">
                            <Button className="rounded-full">Upload content</Button>
                        </Link>
                    </div>
                </div>

                <div className="mt-12">
                    <Suspense fallback={<AnalyticsLoadingSkeleton />}>
                        <AnalyticsContent />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
