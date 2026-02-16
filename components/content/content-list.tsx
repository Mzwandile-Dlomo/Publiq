"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { platformConfigs, type Platform } from "@/lib/platforms";
import { DeleteContentButton } from "@/components/dashboard/delete-content-button";
import { EditContentDialog } from "@/components/content/edit-content-dialog";
import { PublicationStats } from "@/components/content/publication-stats";

type ContentItem = {
    id: string;
    title: string;
    description: string | null;
    mediaUrl: string;
    mediaType: string;
    status: string;
    scheduledAt: string | null;
    createdAt: string;
    publications: {
        id: string;
        platform: string;
        status: string;
        platformPostId: string | null;
        views: number;
        likes: number;
        comments: number;
    }[];
};

const STATUS_FILTERS = ["all", "draft", "scheduled", "published"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const statusBadge: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    scheduled: "bg-blue-100 text-blue-700",
    published: "bg-emerald-100 text-emerald-700",
};

export function ContentList({ items }: { items: ContentItem[] }) {
    const [filter, setFilter] = useState<StatusFilter>("all");
    const [editItem, setEditItem] = useState<ContentItem | null>(null);

    const filtered = filter === "all"
        ? items
        : items.filter((item) => item.status === filter);

    return (
        <>
            <div className="flex items-center gap-2">
                {STATUS_FILTERS.map((f) => (
                    <Button
                        key={f}
                        variant={filter === f ? "default" : "outline"}
                        size="sm"
                        className="rounded-full capitalize"
                        onClick={() => setFilter(f)}
                    >
                        {f}
                        {f !== "all" && (
                            <span className="ml-1.5 text-xs opacity-60">
                                {items.filter((i) => i.status === f).length}
                            </span>
                        )}
                    </Button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-border px-6 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        {filter === "all"
                            ? "You haven't created any content yet."
                            : `No ${filter} content found.`}
                    </p>
                </div>
            ) : (
                <div className="mt-6 space-y-3">
                    {filtered.map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border px-5 py-4"
                        >
                            <div className="space-y-1">
                                <p className="font-medium">{item.title}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusBadge[item.status] ?? "bg-gray-100 text-gray-600"}`}
                                    >
                                        {item.status}
                                    </span>
                                    {item.scheduledAt && item.status === "scheduled" && (
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(item.scheduledAt).toLocaleString()}
                                        </span>
                                    )}
                                    {item.publications.length > 0 && (
                                        <div className="flex gap-1.5">
                                            {item.publications.map((pub) => {
                                                const config = platformConfigs[pub.platform as Platform];
                                                return (
                                                    <span
                                                        key={pub.id}
                                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                                            config
                                                                ? `${config.bgColor} ${config.color}`
                                                                : "bg-gray-100 text-gray-600"
                                                        }`}
                                                    >
                                                        {config?.name ?? pub.platform}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                {item.status === "published" && (
                                    <PublicationStats publications={item.publications} />
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                {item.status !== "published" && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditItem(item)}
                                    >
                                        Edit
                                    </Button>
                                )}
                                <DeleteContentButton contentId={item.id} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <EditContentDialog
                item={editItem}
                onClose={() => setEditItem(null)}
            />
        </>
    );
}
