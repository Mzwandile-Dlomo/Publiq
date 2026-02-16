import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { getPlatformPostUrl, platformConfigs, type Platform } from "@/lib/platforms";
import { ScheduleCalendar } from "@/components/schedule/schedule-calendar";
import { ContentNav } from "@/components/content/content-nav";
import { getAuthenticatedUser } from "@/lib/auth-user";

export default async function SchedulePage() {
    const user = await getAuthenticatedUser();

    type ScheduledPublication = {
        id: string;
        platform: string;
        platformPostId: string | null;
    };

    type ScheduledItem = {
        id: string;
        title: string;
        scheduledAt: Date | null;
        publications: ScheduledPublication[];
    };

    const scheduledItems = await prisma.content.findMany({
        where: {
            userId: user.id,
            status: "scheduled",
        },
        include: {
            publications: true,
        },
        orderBy: {
            scheduledAt: "asc",
        },
    });

    const scheduledDates = (scheduledItems as ScheduledItem[])
        .map((item: ScheduledItem) => item.scheduledAt)
        .filter((date: Date | null): date is Date => Boolean(date))
        .map((date: Date) => date.toISOString());

    return (
        <div className="min-h-screen">
            <ContentNav />
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="text-center">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Schedule
                    </div>
                    <h1 className="font-display mt-3 text-4xl">
                        Keep tabs on what&apos;s next.
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        See what is queued and when each release goes live.
                    </p>
                    <div className="mt-6">
                        <Link href="/upload">
                            <Button className="rounded-full">Schedule new release</Button>
                        </Link>
                    </div>
                </div>

                <div className="mt-12">
                    <ScheduleCalendar scheduledDates={scheduledDates} />
                </div>

                <div className="mt-12">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Upcoming releases</h2>
                        <span className="text-xs text-muted-foreground">
                            {scheduledItems.length} item{scheduledItems.length === 1 ? "" : "s"}
                        </span>
                    </div>

                    {scheduledItems.length === 0 ? (
                        <div className="mt-6 rounded-2xl border border-dashed border-border px-6 py-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                You do not have anything scheduled yet.
                            </p>
                            <div className="mt-4">
                                <Link href="/upload">
                                    <Button variant="outline" className="rounded-full">
                                        Upload a content
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 space-y-3">
                            {(scheduledItems as ScheduledItem[]).map((item: ScheduledItem) => {
                                const scheduledLabel = item.scheduledAt
                                    ? new Date(item.scheduledAt).toLocaleString()
                                    : "Unscheduled";
                                return (
                                    <div
                                        key={item.id}
                                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border px-4 py-4"
                                    >
                                        <div className="space-y-1">
                                            <p className="font-medium">{item.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Releases on {scheduledLabel}
                                            </p>
                                            {item.publications.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {item.publications.map((pub: ScheduledPublication) => {
                                                        const config = platformConfigs[pub.platform as Platform];
                                                        return (
                                                            <span
                                                                key={pub.id}
                                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                                                    config?.bgColor
                                                                        ? `${config.bgColor} ${config.color || "text-foreground"}`
                                                                        : "bg-gray-100 text-gray-600"
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
                                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                                                scheduled
                                            </span>
                                            {item.publications
                                                .filter((pub: ScheduledPublication) => pub.platformPostId)
                                                .map((pub: ScheduledPublication) => {
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
                                                            className={`text-xs font-medium hover:underline ${
                                                                config?.color || "text-primary"
                                                            }`}
                                                        >
                                                            View on {config?.name || pub.platform}
                                                        </a>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
