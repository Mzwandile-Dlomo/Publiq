"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

const NICHE_OPTIONS = [
    "lifestyle", "gaming", "fitness", "beauty", "food", "travel",
    "tech", "fashion", "finance", "education", "music", "comedy",
    "sports", "parenting", "business", "health", "art", "diy",
];

const PLATFORM_OPTIONS = ["youtube", "tiktok", "instagram", "facebook"] as const;

interface CampaignFormData {
    title: string;
    description: string;
    brief: string;
    budget: string;
    currency: string;
    niches: string[];
    platforms: string[];
    deadline: string;
    status: "draft" | "open";
}

interface CreateCampaignModalProps {
    onClose: () => void;
    onCreated: (campaign: unknown) => void;
}

export function CreateCampaignModal({ onClose, onCreated }: CreateCampaignModalProps) {
    const [form, setForm] = useState<CampaignFormData>({
        title: "",
        description: "",
        brief: "",
        budget: "",
        currency: "ZAR",
        niches: [],
        platforms: [],
        deadline: "",
        status: "draft",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function toggleNiche(niche: string) {
        setForm((f) => ({
            ...f,
            niches: f.niches.includes(niche)
                ? f.niches.filter((n) => n !== niche)
                : [...f.niches, niche],
        }));
    }

    function togglePlatform(platform: string) {
        setForm((f) => ({
            ...f,
            platforms: f.platforms.includes(platform)
                ? f.platforms.filter((p) => p !== platform)
                : [...f.platforms, platform],
        }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const res = await fetch("/api/campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    budget: form.budget ? parseFloat(form.budget) : undefined,
                    deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Failed to create campaign");
                return;
            }

            onCreated(data.campaign);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-1 hover:bg-secondary transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>

                <h2 className="text-xl font-semibold">Create Campaign</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Define your campaign brief and invite creators to collaborate.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div>
                        <label className="text-sm font-medium">Campaign Title *</label>
                        <Input
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="e.g. Summer Fitness Campaign"
                            className="mt-1.5 rounded-xl"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="Brief overview of the campaign goal..."
                            className="mt-1.5 rounded-xl"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Creative Brief</label>
                        <Textarea
                            value={form.brief}
                            onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))}
                            placeholder="Detailed instructions for creators: tone, key messages, dos and don'ts..."
                            className="mt-1.5 rounded-xl"
                            rows={5}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Budget</label>
                            <div className="mt-1.5 flex gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.budget}
                                    onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                                    placeholder="0.00"
                                    className="rounded-xl"
                                />
                                <select
                                    value={form.currency}
                                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                                    className="rounded-xl border border-input bg-background px-3 text-sm"
                                >
                                    <option value="ZAR">ZAR</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Deadline</label>
                            <Input
                                type="date"
                                value={form.deadline}
                                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                                className="mt-1.5 rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Target Niches</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {NICHE_OPTIONS.map((niche) => (
                                <button
                                    key={niche}
                                    type="button"
                                    onClick={() => toggleNiche(niche)}
                                    className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                                        form.niches.includes(niche)
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border hover:border-foreground/30"
                                    }`}
                                >
                                    {niche}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Required Platforms</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {PLATFORM_OPTIONS.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => togglePlatform(p)}
                                    className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                                        form.platforms.includes(p)
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border hover:border-foreground/30"
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Publish status</label>
                        <div className="mt-2 flex gap-3">
                            {(["draft", "open"] as const).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                                    className={`rounded-full border px-4 py-1.5 text-xs capitalize transition-colors ${
                                        form.status === s
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border hover:border-foreground/30"
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="rounded-full">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving} className="rounded-full">
                            {saving ? "Creating…" : "Create Campaign"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
