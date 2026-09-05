"use client";

import { useState } from "react";
import { Sparkles, Clock, Hash, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLATFORMS = ["youtube", "tiktok", "instagram", "facebook"] as const;
type Platform = (typeof PLATFORMS)[number];

interface Suggestion {
    optimisedTitle: string;
    optimisedDescription: string;
    hashtags: string[];
    bestPostingTimes: { day: string; time: string; reason: string }[];
    tips: string[];
}

interface AiSuggestPanelProps {
    title: string;
    description?: string;
    onApply?: (data: { title: string; description: string }) => void;
}

export function AiSuggestPanel({ title, description, onApply }: AiSuggestPanelProps) {
    const [platform, setPlatform] = useState<Platform>("youtube");
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
    const [source, setSource] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    async function handleGenerate() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/ai/suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description, platform }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Failed to generate suggestions");
                return;
            }

            setSuggestion(data.suggestions);
            setSource(data.source);
            setExpanded(true);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="rounded-2xl border border-border bg-card">
            {/* Header */}
            <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="flex w-full items-center justify-between px-5 py-4"
            >
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Optimisation
                    {source && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {source === "ai" ? "GPT-4o" : "Rule-based"}
                        </span>
                    )}
                </div>
                {expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
            </button>

            {expanded && (
                <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
                    {/* Platform selector + generate */}
                    <div className="flex flex-wrap items-center gap-2">
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
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleGenerate}
                            disabled={loading || !title}
                            className="ml-auto rounded-full gap-1.5"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            {loading ? "Generating…" : "Generate"}
                        </Button>
                    </div>

                    {error && (
                        <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    {suggestion && (
                        <div className="space-y-4">
                            {/* Optimised title & description */}
                            <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Optimised Title
                                    </p>
                                    <p className="mt-1 text-sm">{suggestion.optimisedTitle}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Optimised Description
                                    </p>
                                    <p className="mt-1 text-sm whitespace-pre-wrap line-clamp-4">
                                        {suggestion.optimisedDescription}
                                    </p>
                                </div>
                                {onApply && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="rounded-full"
                                        onClick={() =>
                                            onApply({
                                                title: suggestion.optimisedTitle,
                                                description: suggestion.optimisedDescription,
                                            })
                                        }
                                    >
                                        Apply to form
                                    </Button>
                                )}
                            </div>

                            {/* Hashtags */}
                            {suggestion.hashtags.length > 0 && (
                                <div>
                                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        <Hash className="h-3.5 w-3.5" />
                                        Hashtags
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {suggestion.hashtags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="rounded-full border border-border px-2.5 py-0.5 text-xs"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Best posting times */}
                            {suggestion.bestPostingTimes.length > 0 && (
                                <div>
                                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5" />
                                        Best Posting Times
                                    </p>
                                    <div className="mt-2 space-y-2">
                                        {suggestion.bestPostingTimes.map((t, i) => (
                                            <div key={i} className="flex items-start gap-3 text-sm">
                                                <span className="shrink-0 font-medium w-28">
                                                    {t.day} {t.time}
                                                </span>
                                                <span className="text-muted-foreground">{t.reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tips */}
                            {suggestion.tips.length > 0 && (
                                <div>
                                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        <Lightbulb className="h-3.5 w-3.5" />
                                        Tips
                                    </p>
                                    <ul className="mt-2 space-y-1.5">
                                        {suggestion.tips.map((tip, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <span className="mt-0.5 text-primary">•</span>
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
