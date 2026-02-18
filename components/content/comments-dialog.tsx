"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MessageSquare, ThumbsUp, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { platformConfigs, type Platform } from "@/lib/platforms";
import type { PlatformComment } from "@/lib/platforms/types";

interface CommentsData {
    [publicationId: string]: {
        platform: string;
        comments: PlatformComment[];
    };
}

function CommentItem({ comment, isReply }: { comment: PlatformComment; isReply?: boolean }) {
    return (
        <div className={`flex gap-3 ${isReply ? "ml-8" : ""}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {comment.authorAvatar ? (
                    <Image
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                    />
                ) : (
                    comment.authorName.charAt(0).toUpperCase()
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{comment.authorName}</span>
                    <span className="text-xs text-muted-foreground">
                        {formatTimestamp(comment.timestamp)}
                    </span>
                </div>
                <p className="mt-0.5 text-sm text-foreground/90">{comment.text}</p>
                {comment.likeCount > 0 && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ThumbsUp className="h-3 w-3" />
                        {comment.likeCount}
                    </span>
                )}
            </div>
        </div>
    );
}

function formatTimestamp(ts: string): string {
    try {
        const date = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    } catch {
        return ts;
    }
}

export function CommentsDialog({
    contentId,
    contentTitle,
    open,
    onOpenChange,
}: {
    contentId: string;
    contentTitle: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const cache = useRef<Map<string, { data: CommentsData; fetchedAt: number }>>(new Map());
    const [data, setData] = useState<CommentsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchComments = useCallback((id: string) => {
        setLoading(true);
        setError(null);
        fetch(`/api/content/${id}/comments`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch comments");
                return res.json();
            })
            .then((d: CommentsData) => {
                cache.current.set(id, { data: d, fetchedAt: Date.now() });
                setData(d);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!open || !contentId) return;

        const cached = cache.current.get(contentId);
        const STALE_MS = 60_000;

        if (cached) {
            setData(cached.data);
            if (Date.now() - cached.fetchedAt > STALE_MS) {
                fetchComments(contentId);
            }
        } else {
            fetchComments(contentId);
        }
    }, [open, contentId, fetchComments]);

    const platforms = data
        ? Object.entries(data).filter(([, v]) => v.comments.length > 0)
        : [];
    const totalComments = platforms.reduce((sum, [, v]) => sum + v.comments.length, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Comments
                    </DialogTitle>
                    <DialogDescription className="truncate">
                        {contentTitle}
                    </DialogDescription>
                </DialogHeader>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Failed to load comments. Please try again.
                    </div>
                )}

                {!loading && !error && totalComments === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        No comments yet.
                    </div>
                )}

                {!loading && !error && platforms.length > 0 && (
                    <div className="space-y-6">
                        {platforms.map(([pubId, { platform, comments }]) => {
                            const config = platformConfigs[platform as Platform];
                            return (
                                <div key={pubId}>
                                    <div className="mb-3 flex items-center gap-2">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                config
                                                    ? `${config.bgColor} ${config.color}`
                                                    : "bg-gray-100 text-gray-600"
                                            }`}
                                        >
                                            {config?.name ?? platform}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {comments.length} comment{comments.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <div className="space-y-4">
                                        {comments.map((comment) => (
                                            <div key={comment.id}>
                                                <CommentItem comment={comment} />
                                                {comment.replies && comment.replies.length > 0 && (
                                                    <div className="mt-3 space-y-3">
                                                        {comment.replies.map((reply) => (
                                                            <CommentItem
                                                                key={reply.id}
                                                                comment={reply}
                                                                isReply
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
