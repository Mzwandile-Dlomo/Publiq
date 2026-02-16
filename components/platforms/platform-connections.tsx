"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAllPlatforms } from "@/lib/platforms";
import { PlatformCard } from "./platform-card";

interface SocialAccount {
    id: string;
    provider: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
}

interface PlatformConnectionsProps {
    connectedAccounts: SocialAccount[];
}

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

    return (
        <div className="space-y-3">
            {platforms.map((platform) => {
                const account = accounts.find(
                    (acc) => acc.provider === platform.id
                );
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
