import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteContentButton } from "@/components/dashboard/delete-content-button";
import { DashboardStats } from "@/components/analytics/dashboard-stats";
import { PlatformConnections } from "@/components/platforms/platform-connections";
import { getPlatformPostUrl, platformConfigs, type Platform } from "@/lib/platforms";

export default async function DashboardPage() {
    const session = await verifySession();

    if (!session) {
        redirect("/auth/login");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId as string },
        include: { socialAccounts: true, subscription: true },
    });

    const contentItems = await prisma.content.findMany({
        where: { userId: session.userId as string },
        include: { publications: true },
        orderBy: { createdAt: "desc" },
    });

    const displayName = user?.name || user?.email || "Creator";
    const initials = displayName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : "—";
    const planName = user?.subscription?.plan ?? "free";

    return (
        <div className="bg-aurora bg-noise min-h-screen">
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-8">
                        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
                            <h1 className="text-3xl font-semibold">Welcome back, {displayName}.</h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Your queue is ready. Schedule, publish, and keep your cadence steady.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link href="/upload">
                                    <Button className="rounded-full">Upload new video</Button>
                                </Link>
                                <Link href="/pricing">
                                    <Button variant="outline" className="rounded-full">Upgrade plan</Button>
                                </Link>
                            </div>
                        </div>

                        <DashboardStats />

                        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold">Your Content</h2>
                                <span className="text-xs text-muted-foreground">
                                    {contentItems.length} item{contentItems.length === 1 ? "" : "s"}
                                </span>
                            </div>

                            {contentItems.length === 0 ? (
                                <p className="mt-4 text-sm text-muted-foreground">No content yet. Upload your first video!</p>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {contentItems.map((item) => {
                                        const successfulPubs = item.publications.filter(
                                            (p) => p.status === "success" && p.platformPostId
                                        );
                                        return (
                                            <div
                                                key={item.id}
                                                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white px-4 py-3"
                                            >
                                                <div className="space-y-1">
                                                    <p className="font-medium">{item.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </p>
                                                    {item.publications.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                                            {item.publications.map((pub) => {
                                                                const config = platformConfigs[pub.platform as Platform];
                                                                return (
                                                                    <span
                                                                        key={pub.id}
                                                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                                                            pub.status === "success"
                                                                                ? `${config?.bgColor || "bg-green-50"} ${config?.color || "text-green-700"}`
                                                                                : pub.status === "failed"
                                                                                    ? "bg-red-50 text-red-600"
                                                                                    : "bg-gray-100 text-gray-500"
                                                                        }`}
                                                                    >
                                                                        {config?.name || pub.platform}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span
                                                        className={`text-xs px-3 py-1 rounded-full ${item.status === "published"
                                                                ? "bg-green-100 text-green-700"
                                                                : item.status === "scheduled"
                                                                    ? "bg-blue-100 text-blue-700"
                                                                    : "bg-amber-100 text-amber-700"
                                                            }`}
                                                    >
                                                        {item.status}
                                                    </span>
                                                    {successfulPubs.map((pub) => {
                                                        const url = getPlatformPostUrl(
                                                            pub.platform as Platform,
                                                            pub.platformPostId!
                                                        );
                                                        const config = platformConfigs[pub.platform as Platform];
                                                        if (!url) return null;
                                                        return (
                                                            <a
                                                                key={pub.id}
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`text-xs font-medium hover:underline ${config?.color || "text-primary"}`}
                                                            >
                                                                View on {config?.name || pub.platform}
                                                            </a>
                                                        );
                                                    })}
                                                    <DeleteContentButton contentId={item.id} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
                            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Account
                            </div>
                            <div className="mt-4 flex items-center gap-4">
                                {user?.image ? (
                                    <img
                                        src={user.image}
                                        alt={displayName}
                                        className="h-14 w-14 rounded-2xl object-cover"
                                    />
                                ) : (
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                                        {initials}
                                    </div>
                                )}
                                <div>
                                    <div className="text-lg font-semibold">{displayName}</div>
                                    <div className="text-xs text-muted-foreground">{user?.email}</div>
                                </div>
                            </div>
                            <div className="mt-5 space-y-3 text-sm">
                                <div className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-3">
                                    <span className="text-muted-foreground">Plan</span>
                                    <span className="font-semibold capitalize">{planName}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-3">
                                    <span className="text-muted-foreground">Member since</span>
                                    <span className="font-semibold">{memberSince}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-3">
                                    <span className="text-muted-foreground">Connected accounts</span>
                                    <span className="font-semibold">{user?.socialAccounts.length ?? 0}</span>
                                </div>
                            </div>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link href="/pricing">
                                    <Button variant="outline" className="rounded-full">Manage plan</Button>
                                </Link>
                                <form action="/api/auth/logout" method="post">
                                    <Button type="submit" variant="secondary" className="rounded-full">
                                        Log out
                                    </Button>
                                </form>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
                            <h2 className="text-xl font-semibold">Connected Accounts</h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Connect your social accounts to publish content across platforms.
                            </p>
                            <div className="mt-4">
                                <PlatformConnections
                                    connectedAccounts={user?.socialAccounts || []}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
