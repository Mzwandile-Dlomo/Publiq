"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const NICHES = [
    "lifestyle", "gaming", "fitness", "beauty", "food", "travel",
    "tech", "fashion", "finance", "education", "music", "comedy",
    "sports", "parenting", "business", "health", "art", "diy",
];

interface Creator {
    id: string;
    name: string | null;
    image: string | null;
    username: string | null;
    bio: string | null;
    niches: string[];
    socialAccounts: { provider: string }[];
    _count: { content: number };
}

export function DiscoverClient() {
    const [creators, setCreators] = useState<Creator[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [selectedNiche, setSelectedNiche] = useState<string | null>(null);

    const fetchCreators = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (selectedNiche) params.set("niche", selectedNiche);

        try {
            const res = await fetch(`/api/discover?${params.toString()}`);
            const data = await res.json();
            setCreators(data.creators ?? []);
        } catch {
            setCreators([]);
        } finally {
            setLoading(false);
        }
    }, [query, selectedNiche]);

    useEffect(() => {
        const t = setTimeout(fetchCreators, 300);
        return () => clearTimeout(t);
    }, [fetchCreators]);

    return (
        <div>
            {/* Search + filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search creators..."
                        className="rounded-full pl-10"
                    />
                </div>
            </div>

            {/* Niche pills */}
            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedNiche(null)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        selectedNiche === null
                            ? "border-foreground bg-foreground text-background"
                            : "border-border hover:border-foreground/30"
                    }`}
                >
                    All
                </button>
                {NICHES.map((niche) => (
                    <button
                        key={niche}
                        onClick={() => setSelectedNiche(selectedNiche === niche ? null : niche)}
                        className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                            selectedNiche === niche
                                ? "border-foreground bg-foreground text-background"
                                : "border-border hover:border-foreground/30"
                        }`}
                    >
                        {niche}
                    </button>
                ))}
            </div>

            {/* Results */}
            <div className="mt-8">
                {loading ? (
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-48 animate-pulse rounded-2xl bg-secondary" />
                        ))}
                    </div>
                ) : creators.length === 0 ? (
                    <p className="py-16 text-center text-muted-foreground">
                        No creators found. Try adjusting your search.
                    </p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {creators.map((creator) => {
                            const displayName = creator.name ?? creator.username ?? "Creator";
                            const initials = displayName
                                .split(" ")
                                .map((p: string) => p[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase();
                            const platforms = [...new Set(creator.socialAccounts.map((a) => a.provider))];

                            return (
                                <Link
                                    key={creator.id}
                                    href={`/profile/${creator.username}`}
                                    className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        {creator.image ? (
                                            <Image
                                                src={creator.image}
                                                alt={displayName}
                                                width={44}
                                                height={44}
                                                className="h-11 w-11 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                                {initials}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold">{displayName}</p>
                                            {creator.username && (
                                                <p className="truncate text-xs text-muted-foreground">
                                                    @{creator.username}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {creator.bio && (
                                        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                                            {creator.bio}
                                        </p>
                                    )}

                                    {creator.niches.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {creator.niches.slice(0, 3).map((n: string) => (
                                                <span
                                                    key={n}
                                                    className="rounded-full border border-border px-2 py-0.5 text-[10px] capitalize"
                                                >
                                                    {n}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-auto pt-3 flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            {creator._count.content} posts
                                        </span>
                                        <div className="flex gap-1">
                                            {platforms.slice(0, 3).map((p) => (
                                                <span
                                                    key={p}
                                                    className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase"
                                                >
                                                    {p.slice(0, 2)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
