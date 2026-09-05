"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, DollarSign } from "lucide-react";

interface Brand {
    id: string;
    name: string | null;
    image: string | null;
}

interface CampaignSummary {
    id: string;
    title: string;
    description: string | null;
    budget: number | null;
    currency: string;
    deadline: string | null;
    status: string;
    brand: Brand;
}

interface ContentSummary {
    id: string;
    title: string;
    thumbnailUrl: string | null;
}

interface Collab {
    id: string;
    status: string;
    fee: number | null;
    currency: string;
    proposal: string | null;
    feedback: string | null;
    campaign: CampaignSummary;
    content: ContentSummary | null;
}

interface CollaborationsClientProps {
    initialCollabs: Collab[];
    profilePublic: boolean;
    username: string | null;
}

const STATUS_COLORS: Record<string, string> = {
    invited: "bg-secondary text-muted-foreground",
    applied: "bg-yellow-500/10 text-yellow-600",
    accepted: "bg-emerald-500/10 text-emerald-600",
    in_progress: "bg-blue-500/10 text-blue-600",
    submitted: "bg-purple-500/10 text-purple-600",
    approved: "bg-emerald-500/10 text-emerald-600",
    paid: "bg-emerald-700/10 text-emerald-700",
    rejected: "bg-destructive/10 text-destructive",
};

const STATUS_ACTIONS: Record<string, { label: string; next: string }[]> = {
    invited: [{ label: "Accept Invite", next: "applied" }],
    accepted: [{ label: "Start Work", next: "in_progress" }],
    in_progress: [{ label: "Submit Work", next: "submitted" }],
};

export function CollaborationsClient({ initialCollabs, profilePublic, username }: CollaborationsClientProps) {
    const [collabs, setCollabs] = useState<Collab[]>(initialCollabs);
    const [proposalTexts, setProposalTexts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    async function handleAction(collabId: string, nextStatus: string) {
        setLoading((l) => ({ ...l, [collabId]: true }));
        try {
            const res = await fetch(`/api/collaborations/${collabId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: nextStatus,
                    proposal: proposalTexts[collabId],
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setCollabs((prev) =>
                    prev.map((c) => (c.id === collabId ? { ...c, ...data.collaboration } : c))
                );
            }
        } finally {
            setLoading((l) => ({ ...l, [collabId]: false }));
        }
    }

    if (collabs.length === 0) {
        return (
            <div className="py-16 text-center text-muted-foreground">
                <p className="text-lg">No collaborations yet.</p>
                {profilePublic ? (
                    <p className="mt-2 text-sm">
                        Your profile is public{username ? ` at /profile/${username}` : ""}. Brands can now
                        discover you; collaboration invitations will appear here.
                    </p>
                ) : (
                    <p className="mt-2 text-sm">
                        Make your profile public on the{" "}
                        <Link href="/settings" className="underline underline-offset-2">
                            settings page
                        </Link>{" "}
                        so brands can discover you.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {collabs.map((collab) => {
                const brandName = collab.campaign.brand.name ?? "Brand";
                const actions = STATUS_ACTIONS[collab.status] ?? [];

                return (
                    <div key={collab.id} className="rounded-2xl border border-border p-6">
                        {/* Brand + Campaign */}
                        <div className="flex items-start gap-4">
                            {collab.campaign.brand.image ? (
                                <Image
                                    src={collab.campaign.brand.image}
                                    alt={brandName}
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                    {brandName[0]?.toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-semibold">{collab.campaign.title}</h3>
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${
                                            STATUS_COLORS[collab.status] ?? "bg-secondary"
                                        }`}
                                    >
                                        {collab.status.replace("_", " ")}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">by {brandName}</p>
                                {collab.campaign.description && (
                                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                                        {collab.campaign.description}
                                    </p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                    {collab.fee && (
                                        <span className="flex items-center gap-1">
                                            <DollarSign className="h-3 w-3" />
                                            {collab.currency} {collab.fee.toLocaleString()}
                                        </span>
                                    )}
                                    {collab.campaign.deadline && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Due {new Date(collab.campaign.deadline).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Feedback from brand */}
                        {collab.feedback && (
                            <div className="mt-4 rounded-xl bg-secondary/50 px-4 py-3">
                                <p className="text-xs font-medium text-muted-foreground">Brand Feedback</p>
                                <p className="mt-1 text-sm">{collab.feedback}</p>
                            </div>
                        )}

                        {/* Proposal input for invited */}
                        {collab.status === "invited" && (
                            <div className="mt-4">
                                <label className="text-sm font-medium">Your Proposal (optional)</label>
                                <Textarea
                                    value={proposalTexts[collab.id] ?? ""}
                                    onChange={(e) =>
                                        setProposalTexts((p) => ({ ...p, [collab.id]: e.target.value }))
                                    }
                                    placeholder="Briefly describe how you would approach this campaign..."
                                    className="mt-1.5 rounded-xl"
                                    rows={3}
                                />
                            </div>
                        )}

                        {/* Action buttons */}
                        {actions.length > 0 && (
                            <div className="mt-4 flex gap-2">
                                {actions.map((action) => (
                                    <Button
                                        key={action.next}
                                        size="sm"
                                        onClick={() => handleAction(collab.id, action.next)}
                                        disabled={loading[collab.id]}
                                        className="rounded-full"
                                    >
                                        {loading[collab.id] ? "…" : action.label}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
