"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateCampaignModal } from "./create-campaign-modal";

interface Campaign {
    id: string;
    title: string;
    description: string | null;
    budget: number | null;
    currency: string;
    status: string;
    deadline: string | null;
    niches: string[];
    platforms: string[];
    _count: { collaborations: number };
    createdAt: string;
}

interface BrandDashboardClientProps {
    initialCampaigns: Campaign[];
}

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-secondary text-muted-foreground",
    open: "bg-emerald-500/10 text-emerald-600",
    in_progress: "bg-blue-500/10 text-blue-600",
    completed: "bg-purple-500/10 text-purple-600",
    canceled: "bg-destructive/10 text-destructive",
};

export function BrandDashboardClient({ initialCampaigns }: BrandDashboardClientProps) {
    const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
    const [showCreate, setShowCreate] = useState(false);

    function handleCreated(campaign: unknown) {
        setCampaigns((prev) => [campaign as Campaign, ...prev]);
        setShowCreate(false);
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold">Campaigns</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage your brand campaigns and creator collaborations.
                    </p>
                </div>
                <Button onClick={() => setShowCreate(true)} className="rounded-full gap-2">
                    <Plus className="h-4 w-4" />
                    New Campaign
                </Button>
            </div>

            {/* Campaign list */}
            {campaigns.length === 0 ? (
                <div className="mt-16 flex flex-col items-center gap-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                        <Plus className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-semibold">No campaigns yet</h2>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        Create your first campaign to start connecting with creators.
                    </p>
                    <Button onClick={() => setShowCreate(true)} className="rounded-full gap-2">
                        <Plus className="h-4 w-4" />
                        Create Campaign
                    </Button>
                </div>
            ) : (
                <div className="mt-8 divide-y divide-border rounded-2xl border border-border">
                    {campaigns.map((campaign) => (
                        <Link
                            key={campaign.id}
                            href={`/brand/campaigns/${campaign.id}`}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="truncate font-medium">{campaign.title}</h3>
                                    <span
                                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${
                                            STATUS_COLORS[campaign.status] ?? "bg-secondary"
                                        }`}
                                    >
                                        {campaign.status.replace("_", " ")}
                                    </span>
                                </div>
                                {campaign.description && (
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                        {campaign.description}
                                    </p>
                                )}
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {campaign._count.collaborations} collaborator
                                        {campaign._count.collaborations !== 1 ? "s" : ""}
                                    </span>
                                    {campaign.deadline && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(campaign.deadline).toLocaleDateString()}
                                        </span>
                                    )}
                                    {campaign.budget && (
                                        <span>
                                            {campaign.currency}{" "}
                                            {campaign.budget.toLocaleString(undefined, {
                                                minimumFractionDigits: 0,
                                            })}
                                        </span>
                                    )}
                                    {campaign.niches.slice(0, 3).map((n) => (
                                        <span
                                            key={n}
                                            className="rounded-full border border-border px-2 py-0.5 capitalize"
                                        >
                                            {n}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                    ))}
                </div>
            )}

            {showCreate && (
                <CreateCampaignModal
                    onClose={() => setShowCreate(false)}
                    onCreated={handleCreated}
                />
            )}
        </>
    );
}
