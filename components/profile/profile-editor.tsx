"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";

const NICHE_OPTIONS = [
    "lifestyle", "gaming", "fitness", "beauty", "food", "travel",
    "tech", "fashion", "finance", "education", "music", "comedy",
    "sports", "parenting", "business", "health", "art", "diy",
];

interface ProfileEditorProps {
    initialData: {
        name: string | null;
        username: string | null;
        bio: string | null;
        niches: string[];
        website: string | null;
        profilePublic: boolean;
        role: string;
    };
}

export function ProfileEditor({ initialData }: ProfileEditorProps) {
    const [form, setForm] = useState({
        name: initialData.name ?? "",
        username: initialData.username ?? "",
        bio: initialData.bio ?? "",
        niches: initialData.niches ?? [],
        website: initialData.website ?? "",
        profilePublic: initialData.profilePublic,
        role: initialData.role,
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function toggleNiche(niche: string) {
        setForm((f) => ({
            ...f,
            niches: f.niches.includes(niche)
                ? f.niches.filter((n) => n !== niche)
                : [...f.niches, niche],
        }));
    }

    async function toggleProfileVisibility() {
        if (saving) return;

        const profilePublic = !form.profilePublic;
        setForm((f) => ({ ...f, profilePublic }));
        setSaving(true);
        setError(null);
        setSaved(false);

        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profilePublic }),
            });
            const data = await res.json();

            if (!res.ok) {
                setForm((f) => ({ ...f, profilePublic: !profilePublic }));
                const message = Array.isArray(data.error)
                    ? data.error.map((e: { message: string }) => e.message).join(", ")
                    : (data.error ?? "Failed to update profile visibility");
                setError(message);
                return;
            }

            setForm((f) => ({ ...f, profilePublic: data.user.profilePublic }));
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch {
            setForm((f) => ({ ...f, profilePublic: !profilePublic }));
            setError("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSaved(false);

        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name || undefined,
                    username: form.username || undefined,
                    bio: form.bio || null,
                    niches: form.niches,
                    website: form.website || null,
                    profilePublic: form.profilePublic,
                    role: form.role,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                const msg = Array.isArray(data.error)
                    ? data.error.map((e: { message: string }) => e.message).join(", ")
                    : (data.error ?? "Failed to save profile");
                setError(msg);
                return;
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="text-sm font-medium">Display Name</label>
                    <Input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Your name"
                        className="mt-1.5 rounded-xl"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium">Username</label>
                    <div className="relative mt-1.5">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            @
                        </span>
                        <Input
                            value={form.username}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))
                            }
                            placeholder="yourhandle"
                            className="rounded-xl pl-7"
                        />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Used for your public profile URL: /profile/yourhandle
                    </p>
                </div>
            </div>

            <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Tell brands and followers about yourself..."
                    className="mt-1.5 rounded-xl"
                    rows={3}
                    maxLength={500}
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{form.bio.length}/500</p>
            </div>

            <div>
                <label className="text-sm font-medium">Website</label>
                <Input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="https://yourwebsite.com"
                    className="mt-1.5 rounded-xl"
                />
            </div>

            <div>
                <label className="text-sm font-medium">Account Type</label>
                <div className="mt-2 flex gap-3">
                    {(["creator", "brand"] as const).map((role) => (
                        <button
                            key={role}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, role }))}
                            className={`rounded-full border px-4 py-1.5 text-sm capitalize transition-colors ${
                                form.role === role
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:border-foreground/30"
                            }`}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="text-sm font-medium">Your Niches</label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Select up to 5 categories that best describe your content.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {NICHE_OPTIONS.map((niche) => (
                        <button
                            key={niche}
                            type="button"
                            onClick={() => toggleNiche(niche)}
                            disabled={!form.niches.includes(niche) && form.niches.length >= 5}
                            className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors disabled:opacity-40 ${
                                form.niches.includes(niche)
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:border-foreground/30"
                            }`}
                        >
                            {niche}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                <div className="flex-1">
                    <p className="text-sm font-medium">Public Profile</p>
                    <p className="text-xs text-muted-foreground">
                        Allow brands and visitors to discover your profile at /profile/{form.username || "yourhandle"}
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={form.profilePublic}
                    aria-label="Toggle public profile"
                    disabled={saving}
                    onClick={toggleProfileVisibility}
                    data-state={form.profilePublic ? "checked" : "unchecked"}
                    style={{
                        backgroundColor: form.profilePublic ? "var(--primary)" : "var(--input)",
                    }}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
                >
                    <span
                        style={{ transform: `translateX(${form.profilePublic ? "20px" : "0"})` }}
                        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform"
                    />
                </button>
                <span className="w-12 text-right text-xs text-muted-foreground" aria-live="polite">
                    {form.profilePublic ? "Public" : "Private"}
                </span>
            </div>

            {error && (
                <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                    {error}
                </p>
            )}

            <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving} className="rounded-full">
                    {saving ? "Saving…" : "Save Profile"}
                </Button>
                {saved && (
                    <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                        <Check className="h-4 w-4" />
                        Saved
                    </span>
                )}
            </div>
        </form>
    );
}
