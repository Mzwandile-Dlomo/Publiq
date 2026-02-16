"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAllPlatforms } from "@/lib/platforms";
import { PlatformCard } from "./platform-card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Youtube, Music2, Instagram, Facebook, Check } from "lucide-react";

interface SocialAccount {
    id: string;
    provider: string;
    providerId?: string;
    name?: string | null;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
    isDefault?: boolean | null;
}

interface PlatformConnectionsProps {
    connectedAccounts: SocialAccount[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Youtube,
    Music2,
    Instagram,
    Facebook,
};

export function PlatformConnections({ connectedAccounts }: PlatformConnectionsProps) {
    const platforms = getAllPlatforms();
    const router = useRouter();
    const [accounts, setAccounts] = useState(connectedAccounts);

    async function handleDisconnect(provider: string) {
        const res = await fetch("/api/auth/disconnect", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider }),
        });

        if (res.ok) {
            setAccounts((prev) => prev.filter((acc) => acc.provider !== provider));
            router.refresh();
        }
    }

    async function handleDisconnectAccount(id: string) {
        const res = await fetch(`/api/social-accounts/${id}`, {
            method: "DELETE",
        });

        if (res.ok) {
            setAccounts((prev) => prev.filter((acc) => acc.id !== id));
            router.refresh();
        }
    }

    async function handleSetDefault(id: string) {
        const res = await fetch(`/api/social-accounts/${id}/default`, {
            method: "PATCH",
        });

        if (res.ok) {
            setAccounts((prev) => {
                const target = prev.find((acc) => acc.id === id);
                if (!target) return prev;
                return prev.map((acc) =>
                    acc.id === id
                        ? { ...acc, isDefault: true }
                        : acc.provider === target.provider
                            ? { ...acc, isDefault: false }
                            : acc
                );
            });
            router.refresh();
        }
    }

    return (
        <div className="space-y-3">
            {platforms.map((platform) => {
                const platformAccounts = accounts.filter(
                    (acc) => acc.provider === platform.id
                );
                const account = platformAccounts[0];

                if (platform.id === "facebook" && platformAccounts.length > 0) {
                    const Icon = iconMap[platform.icon] || Youtube;
                    return (
                        <div
                            key={platform.id}
                            className={`space-y-3 rounded-2xl border ${platform.borderColor} ${platform.bgColor} px-4 py-4`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                                        <Icon className={`h-5 w-5 ${platform.color}`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{platform.name}</span>
                                            <Check className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {platformAccounts.length} page{platformAccounts.length === 1 ? "" : "s"} connected
                                        </div>
                                    </div>
                                </div>
                                <a href={platform.connectUrl}>
                                    <Button variant="outline" size="sm" className="rounded-full">
                                        Connect another
                                    </Button>
                                </a>
                            </div>

                            <div className="space-y-2">
                                {platformAccounts.map((acc) => {
                                    const label = acc.name
                                        || [acc.firstName, acc.lastName].filter(Boolean).join(" ")
                                        || acc.providerId
                                        || "Facebook Page";
                                    const initials = label
                                        .split(" ")
                                        .map((p) => p[0])
                                        .filter(Boolean)
                                        .slice(0, 2)
                                        .join("")
                                        .toUpperCase();

                                    return (
                                        <div
                                            key={acc.id}
                                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/70 px-3 py-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Avatar size="sm">
                                                    {acc.avatarUrl && <AvatarImage src={acc.avatarUrl} alt={label} />}
                                                    <AvatarFallback>{initials || "FB"}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="text-sm font-medium">{label}</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {acc.isDefault ? "Default page" : "Optional"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {acc.isDefault ? (
                                                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                                                        Default
                                                    </span>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-full"
                                                        onClick={() => handleSetDefault(acc.id)}
                                                    >
                                                        Make default
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="rounded-full text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDisconnectAccount(acc.id)}
                                                >
                                                    Disconnect
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                return (
                    <PlatformCard
                        key={platform.id}
                        platform={platform}
                        account={account || null}
                        onDisconnect={handleDisconnect}
                    />
                );
            })}
        </div>
    );
}
