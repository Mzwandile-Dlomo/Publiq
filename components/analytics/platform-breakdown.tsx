"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, ThumbsUp, MessageSquare } from "lucide-react";
import {
    Youtube,
    Music2,
    Instagram,
    Facebook,
} from "lucide-react";
import { PLATFORMS, platformConfigs, type Platform } from "@/lib/platforms";
import type { PlatformStats } from "@/lib/analytics-types";

const platformIcons: Record<Platform, React.ComponentType<{ className?: string }>> = {
    youtube: Youtube,
    tiktok: Music2,
    instagram: Instagram,
    facebook: Facebook,
};

interface PlatformBreakdownProps {
    platforms: Partial<Record<Platform, PlatformStats>>;
    totalViews: number;
    loading?: boolean;
}

export function PlatformBreakdown({ platforms, totalViews, loading }: PlatformBreakdownProps) {
    if (loading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />
                ))}
            </div>
        );
    }

    const connectedPlatforms = PLATFORMS.filter((p) => p in platforms);

    if (connectedPlatforms.length === 0) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Platform Breakdown</h2>
                <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        No connected platforms. Connect a platform in Settings to see analytics.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold">Platform Breakdown</h2>
            <div className="grid gap-4 sm:grid-cols-2">
                {connectedPlatforms.map((platformId) => {
                    const config = platformConfigs[platformId];
                    const stats = platforms[platformId];
                    const Icon = platformIcons[platformId];
                    const views = stats?.views ?? 0;
                    const percentage = totalViews > 0 ? (views / totalViews) * 100 : 0;

                    return (
                        <Card key={platformId} className={`border ${config.borderColor}`}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bgColor}`}>
                                            <Icon className={`h-4 w-4 ${config.color}`} />
                                        </div>
                                        <CardTitle className="text-sm font-medium">
                                            {config.name}
                                        </CardTitle>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {stats?.publicationCount ?? 0} posts
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <Eye className="h-3.5 w-3.5" />
                                        {views.toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <ThumbsUp className="h-3.5 w-3.5" />
                                        {(stats?.likes ?? 0).toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        {(stats?.comments ?? 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <div className="h-2 rounded-full bg-muted">
                                        <div
                                            className={`h-2 rounded-full transition-all ${config.bgColor}`}
                                            style={{
                                                width: `${percentage}%`,
                                                minWidth: percentage > 0 ? "4px" : "0px",
                                            }}
                                        />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        {percentage > 0
                                            ? `${percentage.toFixed(1)}% of total views`
                                            : "No views yet"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
