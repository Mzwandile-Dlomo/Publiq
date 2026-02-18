import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Upload, Calendar, BarChart2, Settings, Eye, Heart } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth-user";

export default async function DashboardPage() {
    const user = await getAuthenticatedUser();
    const userId = user.id;

    const [totalContent, scheduledCount, publishedCount, aggregates] = await Promise.all([
        prisma.content.count({ where: { userId } }),
        prisma.content.count({ where: { userId, status: "scheduled" } }),
        prisma.content.count({ where: { userId, status: "published" } }),
        prisma.publication.aggregate({
            where: { content: { userId } },
            _sum: { views: true, likes: true, comments: true },
        }),
    ]);

    const totalViews = aggregates._sum.views ?? 0;
    const totalLikes = aggregates._sum.likes ?? 0;
    const totalComments = aggregates._sum.comments ?? 0;

    const displayName = user?.name || user?.email || "Creator";
    const connectedCount = user?.socialAccounts.length ?? 0;

    function formatNumber(n: number) {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
        return n.toString();
    }

    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="text-center">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Dashboard
                    </div>
                    <h1 className="font-display mt-3 text-4xl">
                        Welcome back, {displayName}.
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Your queue is ready. Schedule, publish, and keep your cadence steady.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <Link href="/upload">
                            <Button className="rounded-full">Upload content</Button>
                        </Link>
                        <Link href="/pricing">
                            <Button variant="outline" className="rounded-full">Upgrade Plan</Button>
                        </Link>
                    </div>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-border p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Upload className="h-4 w-4" />
                            <span className="text-xs font-medium">Uploads</span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{formatNumber(totalContent)}</p>
                        <p className="text-xs text-muted-foreground">{publishedCount} published</p>
                    </div>

                    <div className="rounded-2xl border border-border p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span className="text-xs font-medium">Scheduled</span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{formatNumber(scheduledCount)}</p>
                        <p className="text-xs text-muted-foreground">in your queue</p>
                    </div>

                    <div className="rounded-2xl border border-border p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Eye className="h-4 w-4" />
                            <span className="text-xs font-medium">Views</span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{formatNumber(totalViews)}</p>
                        <p className="text-xs text-muted-foreground">total across platforms</p>
                    </div>

                    <div className="rounded-2xl border border-border p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Heart className="h-4 w-4" />
                            <span className="text-xs font-medium">Engagement</span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{formatNumber(totalLikes + totalComments)}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(totalLikes)} likes · {formatNumber(totalComments)} comments</p>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <Link href="/schedule" className="group rounded-2xl border border-border p-5 transition-colors hover:border-primary/30">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold group-hover:text-primary transition-colors">Schedule</p>
                                <p className="text-xs text-muted-foreground">
                                    {scheduledCount} upcoming release{scheduledCount === 1 ? "" : "s"}
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/analytics" className="group rounded-2xl border border-border p-5 transition-colors hover:border-primary/30">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                                <BarChart2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold group-hover:text-primary transition-colors">Analytics</p>
                                <p className="text-xs text-muted-foreground">
                                    Track performance across platforms
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/content" className="group rounded-2xl border border-border p-5 transition-colors hover:border-primary/30">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                <Upload className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold group-hover:text-primary transition-colors">Content</p>
                                <p className="text-xs text-muted-foreground">
                                    {totalContent} item{totalContent === 1 ? "" : "s"} uploaded
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/settings" className="group rounded-2xl border border-border p-5 transition-colors hover:border-primary/30">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                                <Settings className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold group-hover:text-primary transition-colors">Settings</p>
                                <p className="text-xs text-muted-foreground">
                                    {connectedCount} connected account{connectedCount === 1 ? "" : "s"}
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
