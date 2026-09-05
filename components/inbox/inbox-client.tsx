"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Send, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { getPlatformPostUrl, platformConfigs, type Platform } from "@/lib/platforms";
import type { PlatformComment } from "@/lib/platforms/types";
import type { InboxEntry } from "@/app/api/inbox/route";
import { Youtube, Music2, Instagram, Facebook } from "lucide-react";
import { toast } from "sonner";

const platformIcons: Record<Platform, React.ComponentType<{ className?: string }>> = {
    youtube: Youtube,
    tiktok: Music2,
    instagram: Instagram,
    facebook: Facebook,
};

interface CommentItemProps {
    comment: PlatformComment;
    depth?: number;
    platform: Platform;
    publicationId: string;
    socialAccountId: string | null;
    onReply?: (commentId: string, text: string) => Promise<void>;
}

function CommentItem({ comment, depth = 0, platform, publicationId, socialAccountId, onReply }: CommentItemProps) {
    const [showReplies, setShowReplies] = useState(false);
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [isPending, startTransition] = useTransition();

    const hasReplies = (comment.replies?.length ?? 0) > 0;
    const indent = depth > 0 ? "ml-8 border-l border-border pl-4" : "";

    function handleSendReply() {
        if (!replyText.trim() || !onReply) return;
        startTransition(async () => {
            try {
                await onReply(comment.id, replyText.trim());
                setReplyText("");
                setReplyOpen(false);
                toast.success("Reply sent");
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to send reply");
            }
        });
    }

    return (
        <div className={indent}>
            <div className="flex items-start gap-3 py-3">
                {comment.authorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {comment.authorName.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.authorName}</span>
                        <span className="text-xs text-muted-foreground">
                            {new Date(comment.timestamp).toLocaleDateString("en-ZA", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                            })}
                        </span>
                    </div>
                    <p className="mt-0.5 text-sm text-foreground/90 break-words">{comment.text}</p>
                    <div className="mt-1 flex items-center gap-3">
                        {comment.likeCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                                {comment.likeCount.toLocaleString()} {comment.likeCount === 1 ? "like" : "likes"}
                            </span>
                        )}
                        {onReply && depth === 0 && (
                            <button
                                onClick={() => setReplyOpen((v) => !v)}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Reply
                            </button>
                        )}
                        {hasReplies && depth === 0 && (
                            <button
                                onClick={() => setShowReplies((v) => !v)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                {comment.replies!.length} {comment.replies!.length === 1 ? "reply" : "replies"}
                            </button>
                        )}
                    </div>

                    {replyOpen && (
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                                placeholder="Write a reply..."
                                className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground/40"
                                disabled={isPending}
                            />
                            <button
                                onClick={handleSendReply}
                                disabled={isPending || !replyText.trim()}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                            >
                                <Send className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showReplies && hasReplies && (
                <div>
                    {comment.replies!.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            depth={depth + 1}
                            platform={platform}
                            publicationId={publicationId}
                            socialAccountId={socialAccountId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface InboxEntryCardProps {
    entry: InboxEntry;
}

function InboxEntryCard({ entry }: InboxEntryCardProps) {
    const [expanded, setExpanded] = useState(true);
    const config = platformConfigs[entry.platform];
    const Icon = platformIcons[entry.platform];
    const postUrl = getPlatformPostUrl(entry.platform, entry.platformPostId);
    const totalComments = entry.comments.length;

    async function handleReply(commentId: string, message: string) {
        const res = await fetch("/api/inbox/reply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                platform: entry.platform,
                commentId,
                publicationId: entry.publicationId,
                message,
                socialAccountId: entry.socialAccountId,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Reply failed");
    }

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bgColor}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{entry.contentTitle}</p>
                        <p className="text-xs text-muted-foreground">{config.name}</p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    {postUrl && (
                        <a
                            href={postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {totalComments}
                    </span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
            </button>

            {expanded && (
                <div className="divide-y divide-border border-t border-border px-5">
                    {totalComments === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">No comments yet.</p>
                    ) : (
                        entry.comments.map((comment) => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                platform={entry.platform}
                                publicationId={entry.publicationId}
                                socialAccountId={entry.socialAccountId}
                                onReply={handleReply}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

interface InboxClientProps {
    entries: InboxEntry[];
}

export function InboxClient({ entries }: InboxClientProps) {
    const [filter, setFilter] = useState<Platform | "all">("all");

    const platforms = Array.from(new Set(entries.map((e) => e.platform))) as Platform[];

    const filtered = filter === "all"
        ? entries
        : entries.filter((e) => e.platform === filter);

    const totalComments = entries.reduce((sum, e) => sum + e.comments.length, 0);

    return (
        <div className="space-y-6">
            {/* Filter bar */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setFilter("all")}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        filter === "all"
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                >
                    All ({totalComments})
                </button>
                {platforms.map((p) => {
                    const config = platformConfigs[p];
                    const count = entries.filter((e) => e.platform === p).reduce((s, e) => s + e.comments.length, 0);
                    return (
                        <button
                            key={p}
                            onClick={() => setFilter(p)}
                            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                                filter === p
                                    ? "bg-primary text-primary-foreground"
                                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {config.name} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Entries */}
            {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
                    <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">
                        No comments yet. Publish content to start receiving comments.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((entry) => (
                        <InboxEntryCard key={entry.publicationId} entry={entry} />
                    ))}
                </div>
            )}
        </div>
    );
}
