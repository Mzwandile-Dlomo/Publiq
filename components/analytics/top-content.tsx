"use client";

import { Eye, ThumbsUp, MessageSquare, ExternalLink } from "lucide-react";
import { platformConfigs, getPlatformPostUrl } from "@/lib/platforms";
import type { TopContentItem } from "@/lib/analytics-types";

interface TopContentProps {
    items: TopContentItem[];
    loading?: boolean;
}

export function TopContent({ items, loading }: TopContentProps) {
    if (loading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
                ))}
            </div>
        );
    }

    const hasStats = items.some((item) => item.views + item.likes + item.comments > 0);

    if (items.length === 0 || !hasStats) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Top Performing Content</h2>
                <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        No published content with stats yet. Publish content to see performance data.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold">Top Performing Content</h2>
            <div className="space-y-2">
                {items.map((item, index) => {
                    const config = platformConfigs[item.platform];
                    const postUrl = item.platformPostId
                        ? getPlatformPostUrl(item.platform, item.platformPostId)
                        : null;

                    return (
                        <div
                            key={item.publicationId}
                            className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3"
                        >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                {index + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-medium">
                                        {item.title}
                                    </p>
                                    {postUrl && (
                                        <a
                                            href={postUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0 text-muted-foreground hover:text-foreground"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                                <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                        config
                                            ? `${config.bgColor} ${config.color}`
                                            : "bg-gray-100 text-gray-600"
                                    }`}
                                >
                                    {config?.name ?? item.platform}
                                </span>
                            </div>

                            <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {item.views.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                    <ThumbsUp className="h-3 w-3" />
                                    {item.likes.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {item.comments.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
