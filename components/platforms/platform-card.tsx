"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { PlatformConfig } from "@/lib/platforms";
import { Youtube, Music2, Instagram, Facebook, Check, Lock, Loader2 } from "lucide-react";

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
    onDisconnect?: (provider: string) => void;
}

export function PlatformCard({ platform, account, onDisconnect }: PlatformCardProps) {
    const Icon = iconMap[platform.icon] || Youtube;
    const isConnected = !!account;

    if (!platform.available) {
        return (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 opacity-60">
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
                {onDisconnect && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full text-muted-foreground hover:text-destructive"
                            >
                                Disconnect
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Disconnect {platform.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will remove your {platform.name} connection. You won&apos;t be able to publish to this platform until you reconnect.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    variant="destructive"
                                    className="rounded-full"
                                    onClick={() => {
                                        onDisconnect(platform.id);
                                        toast.success(`${platform.name} disconnected`);
                                    }}
                                >
                                    Disconnect
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
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
            <a href={platform.connectUrl}>
                <Button variant="outline" size="sm" className="rounded-full">
                    Connect
                </Button>
            </a>
        </div>
    );
}
