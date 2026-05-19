"use client";

import { useState } from "react";
import { Sparkles, Lightbulb, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const NICHE_OPTIONS = [
    "lifestyle", "gaming", "fitness", "beauty", "food", "travel",
    "tech", "fashion", "finance", "education", "music", "comedy",
    "sports", "parenting", "business", "health", "art", "diy",
];

const PLATFORMS = ["youtube", "tiktok", "instagram", "facebook"] as const;

interface Idea {
    title: string;
    concept: string;
    format: string;
    hook: string;
    trend: string;
}

export function AiIdeasPanel({ userNiches }: { userNiches?: string[] }) {
    const [selectedNiches, setSelectedNiches] = useState<string[]>(userNiches ?? []);
    const [platform, setPlatform] = useState<string>("");
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [source, setSource] = useState<string>("");

    function toggleNiche(niche: string) {
        setSelectedNiches((prev) =>
            prev.includes(niche) ? prev.filter((n) => n !== niche) : [...prev, niche]
        );
    }

    async function handleGenerate() {
        if (selectedNiches.length === 0) {
            setError("Select at least one niche");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/ai/ideas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    niches: selectedNiches,
                    platform: platform || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Failed to generate ideas");
                return;
            }

            setIdeas(data.ideas ?? []);
            setSource(data.source ?? "");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Niche selector */}
            <div>
                <p className="text-sm font-medium">Your Niches</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {NICHE_OPTIONS.map((niche) => (
                        <button
                            key={niche}
                            type="button"
                            onClick={() => toggleNiche(niche)}
                            className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                                selectedNiches.includes(niche)
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:border-foreground/30"
                            }`}
                        >
                            {niche}
                        </button>
                    ))}
                </div>
            </div>

            {/* Platform filter */}
            <div>
                <p className="text-sm font-medium">Platform (optional)</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setPlatform("")}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            platform === ""
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-foreground/30"
                        }`}
                    >
                        All platforms
                    </button>
                    {PLATFORMS.map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPlatform(p)}
                            className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                                platform === p
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:border-foreground/30"
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading}
                    className="rounded-full gap-2"
                >
                    <Sparkles className="h-4 w-4" />
                    {loading ? "Generating ideas…" : "Generate Ideas"}
                </Button>
                {ideas.length > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerate}
                        disabled={loading}
                        className="rounded-full gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                )}
                {source && (
                    <span className="text-xs text-muted-foreground">
                        {source === "ai" ? "Powered by GPT-4o" : "Rule-based suggestions"}
                    </span>
                )}
            </div>

            {error && (
                <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                    {error}
                </p>
            )}

            {ideas.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                    {ideas.map((idea, i) => (
                        <div key={i} className="rounded-2xl border border-border p-5 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold leading-snug">{idea.title}</h3>
                                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium capitalize">
                                    {idea.format?.replace("-", " ")}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{idea.concept}</p>

                            {idea.hook && (
                                <div className="rounded-xl bg-primary/5 px-3 py-2">
                                    <p className="text-xs font-medium text-primary">Opening hook</p>
                                    <p className="mt-1 text-sm italic">&ldquo;{idea.hook}&rdquo;</p>
                                </div>
                            )}

                            {idea.trend && (
                                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
                                    {idea.trend}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
