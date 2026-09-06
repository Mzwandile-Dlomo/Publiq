"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrandCollaboration {
    id: string;
    status: string;
    fee: number | null;
    currency: string;
    proposal: string | null;
    campaign: { id: string; title: string };
    creator: { name: string | null; image: string | null; username: string | null; niches: string[] };
}

const STATUS_COLORS: Record<string, string> = {
    invited: "bg-secondary text-muted-foreground",
    applied: "bg-yellow-500/10 text-yellow-700",
    accepted: "bg-emerald-500/10 text-emerald-700",
    in_progress: "bg-blue-500/10 text-blue-700",
    submitted: "bg-purple-500/10 text-purple-700",
    approved: "bg-emerald-500/10 text-emerald-700",
    paid: "bg-emerald-700/10 text-emerald-800",
    rejected: "bg-destructive/10 text-destructive",
};

export function BrandPartnershipsClient({ initialCollabs }: { initialCollabs: BrandCollaboration[] }) {
    const [collabs, setCollabs] = useState(initialCollabs);
    const [saving, setSaving] = useState<Record<string, boolean>>({});

    async function updateStatus(id: string, status: "accepted" | "rejected" | "approved" | "paid") {
        setSaving((current) => ({ ...current, [id]: true }));
        try {
            const response = await fetch(`/api/collaborations/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (response.ok) {
                setCollabs((current) => current.map((collab) =>
                    collab.id === id ? { ...collab, status } : collab
                ));
            }
        } finally {
            setSaving((current) => ({ ...current, [id]: false }));
        }
    }

    if (collabs.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                <p className="text-lg font-medium">No partnerships yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">Create a campaign, then invite creators to work with your brand.</p>
                <Link href="/brand" className="mt-5 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">View campaigns</Link>
            </div>
        );
    }

    return <div className="space-y-4">{collabs.map((collab) => {
        const creatorName = collab.creator.name ?? collab.creator.username ?? "Creator";
        const actions = collab.status === "applied"
            ? [{ label: "Accept", status: "accepted" as const, icon: Check }, { label: "Decline", status: "rejected" as const, icon: X }]
            : collab.status === "submitted"
                ? [{ label: "Approve", status: "approved" as const, icon: Check }, { label: "Decline", status: "rejected" as const, icon: X }]
                : collab.status === "approved"
                    ? [{ label: "Mark paid", status: "paid" as const, icon: Check }]
                    : [];

        return <article key={collab.id} className="rounded-2xl border border-border p-5">
            <div className="flex gap-4">
                {collab.creator.image ? <Image src={collab.creator.image} alt={creatorName} width={44} height={44} className="h-11 w-11 rounded-full object-cover" /> :
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{creatorName[0]?.toUpperCase()}</div>}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{creatorName}</h2>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLORS[collab.status] ?? "bg-secondary"}`}>{collab.status.replace("_", " ")}</span>
                    </div>
                    <Link href={`/brand/campaigns/${collab.campaign.id}`} className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        {collab.campaign.title}<ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    {collab.proposal && <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">{collab.proposal}</p>}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {collab.fee && <span>{collab.currency} {collab.fee.toLocaleString()}</span>}
                        {collab.creator.niches.slice(0, 3).map((niche) => <span key={niche} className="rounded-full border border-border px-2 py-0.5 capitalize">{niche}</span>)}
                    </div>
                    {actions.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{actions.map((action) => {
                        const Icon = action.icon;
                        return <Button key={action.status} size="sm" variant={action.status === "rejected" ? "outline" : "default"} className="rounded-full gap-1" disabled={saving[collab.id]} onClick={() => updateStatus(collab.id, action.status)}><Icon className="h-3.5 w-3.5" />{action.label}</Button>;
                    })}</div>}
                </div>
            </div>
        </article>;
    })}</div>;
}
