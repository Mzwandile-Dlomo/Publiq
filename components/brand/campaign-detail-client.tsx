"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, UserPlus, Check, X } from "lucide-react";

interface Collaborator {
    id: string;
    status: string;
    fee: number | null;
    currency: string;
    proposal: string | null;
    feedback: string | null;
    creator: {
        id: string;
        name: string | null;
        image: string | null;
        username: string | null;
        niches: string[];
    };
}

interface Campaign {
    id: string;
    title: string;
    description: string | null;
    brief: string | null;
    budget: number | null;
    currency: string;
    status: string;
    deadline: string | null;
    niches: string[];
    platforms: string[];
    collaborations: Collaborator[];
}

interface CampaignDetailClientProps {
    campaign: Campaign;
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

export function CampaignDetailClient({ campaign: initial }: CampaignDetailClientProps) {
    const [campaign, setCampaign] = useState<Campaign>(initial);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteCreatorId, setInviteCreatorId] = useState("");
    const [inviteFee, setInviteFee] = useState("");
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviting, setInviting] = useState(false);

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        setInviting(true);
        setInviteError(null);

        try {
            const res = await fetch(`/api/campaigns/${campaign.id}/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    creatorId: inviteCreatorId,
                    fee: inviteFee ? parseFloat(inviteFee) : undefined,
                    currency: campaign.currency,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setInviteError(data.error ?? "Failed to invite creator");
                return;
            }

            // Refresh campaign collaborations
            const campaignRes = await fetch(`/api/campaigns/${campaign.id}`);
            const campaignData = await campaignRes.json();
            setCampaign(campaignData.campaign);
            setInviteOpen(false);
            setInviteCreatorId("");
            setInviteFee("");
        } catch {
            setInviteError("Network error. Please try again.");
        } finally {
            setInviting(false);
        }
    }

    async function updateCollabStatus(collabId: string, status: string, feedback?: string) {
        const res = await fetch(`/api/collaborations/${collabId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, feedback }),
        });

        if (res.ok) {
            const campaignRes = await fetch(`/api/campaigns/${campaign.id}`);
            const campaignData = await campaignRes.json();
            setCampaign(campaignData.campaign);
        }
    }

    return (
        <div>
            <Link
                href="/brand"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                All Campaigns
            </Link>

            {/* Campaign header */}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-semibold">{campaign.title}</h1>
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                STATUS_COLORS[campaign.status] ?? "bg-secondary"
                            }`}
                        >
                            {campaign.status.replace("_", " ")}
                        </span>
                    </div>
                    {campaign.description && (
                        <p className="mt-2 text-muted-foreground">{campaign.description}</p>
                    )}
                </div>
                <Button
                    onClick={() => setInviteOpen(true)}
                    className="shrink-0 rounded-full gap-2"
                >
                    <UserPlus className="h-4 w-4" />
                    Invite Creator
                </Button>
            </div>

            {/* Details grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {campaign.budget && (
                    <div className="rounded-2xl border border-border p-4">
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="mt-1 text-lg font-semibold">
                            {campaign.currency}{" "}
                            {campaign.budget.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </p>
                    </div>
                )}
                {campaign.deadline && (
                    <div className="rounded-2xl border border-border p-4">
                        <p className="text-xs text-muted-foreground">Deadline</p>
                        <p className="mt-1 text-lg font-semibold">
                            {new Date(campaign.deadline).toLocaleDateString()}
                        </p>
                    </div>
                )}
                <div className="rounded-2xl border border-border p-4">
                    <p className="text-xs text-muted-foreground">Collaborators</p>
                    <p className="mt-1 text-lg font-semibold">{campaign.collaborations.length}</p>
                </div>
            </div>

            {/* Brief */}
            {campaign.brief && (
                <div className="mt-6 rounded-2xl border border-border p-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Creative Brief
                    </h2>
                    <p className="mt-3 whitespace-pre-wrap text-sm">{campaign.brief}</p>
                </div>
            )}

            {/* Niches + Platforms */}
            {(campaign.niches.length > 0 || campaign.platforms.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {campaign.niches.map((n) => (
                        <span key={n} className="rounded-full border border-border px-3 py-1 text-xs capitalize">
                            {n}
                        </span>
                    ))}
                    {campaign.platforms.map((p) => (
                        <span key={p} className="rounded-full bg-secondary px-3 py-1 text-xs capitalize">
                            {p}
                        </span>
                    ))}
                </div>
            )}

            {/* Collaborators list */}
            <div className="mt-10">
                <h2 className="text-xl font-semibold">Collaborators</h2>
                {campaign.collaborations.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                        No collaborators yet. Invite creators to get started.
                    </p>
                ) : (
                    <div className="mt-4 divide-y divide-border rounded-2xl border border-border">
                        {campaign.collaborations.map((collab) => {
                            const displayName =
                                collab.creator.name ?? collab.creator.username ?? "Creator";
                            const initials = displayName
                                .split(" ")
                                .map((p: string) => p[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase();

                            return (
                                <div
                                    key={collab.id}
                                    className="flex items-center gap-4 px-6 py-4"
                                >
                                    {collab.creator.image ? (
                                        <Image
                                            src={collab.creator.image}
                                            alt={displayName}
                                            width={40}
                                            height={40}
                                            className="h-10 w-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                            {initials}
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{displayName}</p>
                                            {collab.creator.username && (
                                                <Link
                                                    href={`/profile/${collab.creator.username}`}
                                                    className="text-xs text-muted-foreground hover:underline"
                                                    target="_blank"
                                                >
                                                    @{collab.creator.username}
                                                </Link>
                                            )}
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                                    STATUS_COLORS[collab.status] ?? "bg-secondary"
                                                }`}
                                            >
                                                {collab.status.replace("_", " ")}
                                            </span>
                                        </div>
                                        {collab.proposal && (
                                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                {collab.proposal}
                                            </p>
                                        )}
                                        {collab.fee && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Fee: {collab.currency} {collab.fee.toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-2">
                                        {collab.status === "applied" && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-full gap-1"
                                                    onClick={() => updateCollabStatus(collab.id, "accepted")}
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                    Accept
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-full gap-1 text-destructive hover:text-destructive"
                                                    onClick={() => updateCollabStatus(collab.id, "rejected")}
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                    Reject
                                                </Button>
                                            </>
                                        )}
                                        {collab.status === "submitted" && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-full gap-1"
                                                    onClick={() => updateCollabStatus(collab.id, "approved")}
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-full gap-1 text-destructive hover:text-destructive"
                                                    onClick={() => updateCollabStatus(collab.id, "rejected")}
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                    Reject
                                                </Button>
                                            </>
                                        )}
                                        {collab.status === "approved" && (
                                            <Button
                                                size="sm"
                                                className="rounded-full gap-1"
                                                onClick={() => updateCollabStatus(collab.id, "paid")}
                                            >
                                                Mark Paid
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Invite modal */}
            {inviteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
                        <button
                            onClick={() => setInviteOpen(false)}
                            className="absolute right-4 top-4 rounded-full p-1 hover:bg-secondary transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <h2 className="text-xl font-semibold">Invite Creator</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Enter the creator&apos;s Publiq user ID to invite them.
                        </p>

                        <form onSubmit={handleInvite} className="mt-5 space-y-4">
                            <div>
                                <label className="text-sm font-medium">Creator User ID *</label>
                                <Input
                                    value={inviteCreatorId}
                                    onChange={(e) => setInviteCreatorId(e.target.value)}
                                    placeholder="cuid..."
                                    className="mt-1.5 rounded-xl"
                                    required
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    You can find this on the creator&apos;s profile or via the Discover page.
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Agreed Fee ({campaign.currency})</label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={inviteFee}
                                    onChange={(e) => setInviteFee(e.target.value)}
                                    placeholder="Optional"
                                    className="mt-1.5 rounded-xl"
                                />
                            </div>

                            {inviteError && (
                                <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                                    {inviteError}
                                </p>
                            )}

                            <div className="flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setInviteOpen(false)}
                                    className="rounded-full"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={inviting} className="rounded-full">
                                    {inviting ? "Inviting…" : "Send Invite"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
