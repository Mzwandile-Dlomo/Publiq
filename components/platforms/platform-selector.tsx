"use client";

import { useState, useEffect } from "react";
import { getAllPlatforms, type Platform, type MediaType } from "@/lib/platforms";
import { Youtube, Music2, Instagram, Facebook, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Youtube,
    Music2,
    Instagram,
    Facebook,
};

interface ConnectedAccount {
    provider: string;
}

interface PlatformSelectorProps {
    selected: Platform[];
    onChange: (platforms: Platform[]) => void;
    mediaType?: MediaType;
}

export function PlatformSelector({ selected, onChange, mediaType }: PlatformSelectorProps) {
    const platforms = getAllPlatforms();
    const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchConnected() {
            try {
                const res = await fetch("/api/auth/me");
                if (res.ok) {
                    const data = await res.json();
                    const providers = (data.user?.socialAccounts || []).map(
                        (acc: ConnectedAccount) => acc.provider
                    );
                    setConnectedProviders(providers);
                }
            } catch {
                // Silently fail — user may not be fully loaded yet
            } finally {
                setLoading(false);
            }
        }
        fetchConnected();
    }, []);

    function toggle(platform: Platform) {
        if (selected.includes(platform)) {
            onChange(selected.filter((p) => p !== platform));
        } else {
            onChange([...selected, platform]);
        }
    }

    if (loading) {
        return (
            <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 w-24 animate-pulse rounded-xl bg-muted" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => {
                const Icon = iconMap[platform.icon] || Youtube;
                const isConnected = connectedProviders.includes(platform.id);
                const isSelected = selected.includes(platform.id);
                const supportsMediaType = !mediaType || platform.supportedMediaTypes.includes(mediaType);
                const isDisabled = !platform.available || !isConnected || !supportsMediaType;

                return (
                    <button
                        key={platform.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => toggle(platform.id)}
                        className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all",
                            isSelected
                                ? `${platform.borderColor} ${platform.bgColor} ${platform.color} font-medium`
                                : "border-border bg-white text-muted-foreground hover:bg-muted/50",
                            isDisabled && "cursor-not-allowed opacity-40"
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        <span>{platform.name}</span>
                        {!platform.available && <Lock className="h-3 w-3" />}
                    </button>
                );
            })}
        </div>
    );
}
