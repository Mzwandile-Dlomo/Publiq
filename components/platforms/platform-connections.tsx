"use client";

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

    return (
        <div className="space-y-3">
            {platforms.map((platform) => {
                const account = connectedAccounts.find(
                    (acc) => acc.provider === platform.id
                );
                return (
                    <PlatformCard
                        key={platform.id}
                        platform={platform}
                        account={account || null}
                    />
                );
            })}
        </div>
    );
}
