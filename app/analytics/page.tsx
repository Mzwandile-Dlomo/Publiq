import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { getAuthenticatedUser } from "@/lib/auth-user";

export default async function AnalyticsPage() {
    await getAuthenticatedUser();

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
                            <Button className="rounded-full">Upload new content</Button>
                        </Link>
                    </div>
                </div>

                <div className="mt-12">
                    <AnalyticsDashboard />
                </div>
            </div>
        </div>
    );
}
