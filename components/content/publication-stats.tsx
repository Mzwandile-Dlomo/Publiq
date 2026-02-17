"use client";

import { Eye, ThumbsUp, MessageSquare } from "lucide-react";
import { platformConfigs, type Platform } from "@/lib/platforms";

interface PublicationWithStats {
    id: string;
    platform: string;
    status: string;
    views: number;
    likes: number;
    comments: number;
}

export function PublicationStats({
    publications,
    onViewComments,
}: {
    publications: PublicationWithStats[];
    onViewComments?: () => void;
}) {
    const withStats = publications.filter(
        (p) => p.status === "success" && (p.views + p.likes + p.comments) > 0
    );

    if (withStats.length === 0) return null;

    const hasComments = withStats.some((p) => p.comments > 0);

    return (
        <div className="mt-2 space-y-1">
            {withStats.map((pub) => {
                const config = platformConfigs[pub.platform as Platform];
                return (
                    <div
                        key={pub.id}
                        className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
                    >
                        <span className={`font-medium ${config?.color ?? "text-gray-600"}`}>
                            {config?.name ?? pub.platform}
                        </span>
                        <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {pub.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {pub.likes.toLocaleString()}
                        </span>
                        {pub.comments > 0 && onViewComments ? (
                            <button
                                type="button"
                                onClick={onViewComments}
                                className="flex items-center gap-1 underline-offset-2 hover:underline hover:text-foreground transition-colors"
                            >
                                <MessageSquare className="h-3 w-3" />
                                {pub.comments.toLocaleString()}
                            </button>
                        ) : (
                            <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {pub.comments.toLocaleString()}
                            </span>
                        )}
                    </div>
                );
            })}
            {hasComments && onViewComments && (
                <button
                    type="button"
                    onClick={onViewComments}
                    className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground transition-colors"
                >
                    View comments
                </button>
            )}
        </div>
    );
}
