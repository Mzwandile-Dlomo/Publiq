"use client";

import { Button } from "@/components/ui/button";
import type { PlatformConfig } from "@/lib/platforms";
import { Youtube, Music2, Instagram, Facebook, Check, Lock } from "lucide-react";
import Link from "next/link";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Youtube,
    Music2,
    Instagram,
    Facebook,
};

interface SocialAccount {
    id: string;
    provider: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
}

interface PlatformCardProps {
    platform: PlatformConfig;
    account: SocialAccount | null;
}

export function PlatformCard({ platform, account }: PlatformCardProps) {
    const Icon = iconMap[platform.icon] || Youtube;
    const isConnected = !!account;

    if (!platform.available) {
        return (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-white/60 px-4 py-4 opacity-60">
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${platform.bgColor}`}>
                        <Icon className={`h-5 w-5 ${platform.color}`} />
                    </div>
                    <div>
                        <div className="font-medium">{platform.name}</div>
                        <div className="text-xs text-muted-foreground">{platform.description}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    Coming soon
                </div>
            </div>
        );
    }

    if (isConnected) {
        const accountLabel = account.email || [account.firstName, account.lastName].filter(Boolean).join(" ") || "Connected";
        return (
            <div className={`flex items-center justify-between rounded-2xl border ${platform.borderColor} ${platform.bgColor} px-4 py-4`}>
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white`}>
                        <Icon className={`h-5 w-5 ${platform.color}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{platform.name}</span>
                            <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="text-xs text-muted-foreground">{accountLabel}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-4">
            <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${platform.bgColor}`}>
                    <Icon className={`h-5 w-5 ${platform.color}`} />
                </div>
                <div>
                    <div className="font-medium">{platform.name}</div>
                    <div className="text-xs text-muted-foreground">{platform.description}</div>
                </div>
            </div>
            <Link href={platform.connectUrl}>
                <Button variant="outline" size="sm" className="rounded-full">
                    Connect
                </Button>
            </Link>
        </div>
    );
}
