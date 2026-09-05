import { Button } from "@/components/ui/button";
import { PlatformConnections } from "@/components/platforms/platform-connections";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { ProfileEditor } from "@/components/profile/profile-editor";

export default async function SettingsPage() {
    const user = await getAuthenticatedUser();

    const planName = user?.subscription?.plan ?? "free";

    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="text-center">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Settings
                    </div>
                    <h1 className="font-display mt-3 text-4xl">
                        Manage your account.
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Update your profile, connections, and preferences.
                    </p>
                </div>

                <div className="mt-12 grid gap-6 md:grid-cols-2">
                    <div className="flex flex-col rounded-2xl border border-border p-6">
                        <h2 className="text-xl font-semibold">Profile</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Your display name, public creator profile, and niches.
                        </p>
                        <div className="mt-6">
                            <ProfileEditor
                                initialData={{
                                    name: user.name ?? null,
                                    username: (user as { username?: string | null }).username ?? null,
                                    bio: (user as { bio?: string | null }).bio ?? null,
                                    niches: (user as { niches?: string[] }).niches ?? [],
                                    website: (user as { website?: string | null }).website ?? null,
                                    profilePublic: (user as { profilePublic?: boolean }).profilePublic ?? false,
                                    role: (user as { role?: string }).role ?? "creator",
                                }}
                            />
                        </div>

                        <div className="mt-auto pt-6">
                            <div className="rounded-2xl border border-border p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold">Plan</p>
                                            <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold capitalize text-primary">
                                                {planName}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {planName === "free"
                                                ? "Upgrade to unlock unlimited uploads and all platforms."
                                                : "You have full access to all features."}
                                        </p>
                                    </div>
                                    {planName === "free" ? (
                                        <Link href="/pricing">
                                            <Button size="sm" className="rounded-full gap-2">
                                                <Sparkles className="h-3.5 w-3.5" />
                                                Upgrade
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button size="sm" variant="outline" className="rounded-full">
                                            Manage
                                        </Button>
                                    )}
                                </div>

                                {planName === "free" && (
                                    <ul className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                        <li className="flex items-center gap-2">
                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            Unlimited uploads
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            All platforms
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            Advanced scheduling
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            Priority support
                                        </li>
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="rounded-2xl border border-border p-6">
                            <h2 className="text-xl font-semibold">Connected Accounts</h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Connect your social accounts to publish content across platforms.
                            </p>
                            <div className="mt-4">
                                <PlatformConnections
                                    connectedAccounts={user?.socialAccounts || []}
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border p-6">
                            <h2 className="text-xl font-semibold">Security</h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Update credentials and manage sessions.
                            </p>
                            <div className="mt-6 space-y-3">
                                <Button variant="outline" className="w-full rounded-full">
                                    Change password
                                </Button>
                                <form action="/api/auth/logout" method="post">
                                    <Button type="submit" variant="secondary" className="w-full rounded-full">
                                        Log out
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <SiteFooter />
            </div>
        </div>
    );
}
