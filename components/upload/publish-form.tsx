"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PlatformSelector } from "@/components/platforms/platform-selector";
import type { Platform } from "@/lib/platforms";
import type { MediaType } from "@/lib/platforms/types";

const metadataSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
});

type MetadataFormValues = z.infer<typeof metadataSchema>;

type SocialAccount = {
    id: string;
    provider: string;
    providerId: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
    isDefault?: boolean | null;
};

interface PublishFormProps {
    fileUrl: string;
    fileName: string;
    mediaType: MediaType;
}

export function PublishForm({ fileUrl, fileName, mediaType }: PublishFormProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [contentId, setContentId] = useState<string | null>(null);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
    const [facebookPages, setFacebookPages] = useState<SocialAccount[]>([]);
    const [selectedFacebookPageId, setSelectedFacebookPageId] = useState<string | null>(null);

    const { register, handleSubmit, trigger, getValues, formState: { errors } } = useForm<MetadataFormValues>({
        resolver: zodResolver(metadataSchema),
        defaultValues: {
            title: fileName.split(".").slice(0, -1).join(".") || fileName,
            description: "",
        },
    });

    useEffect(() => {
        async function fetchAccounts() {
            try {
                const res = await fetch("/api/auth/me");
                if (!res.ok) return;
                const data = await res.json();
                const accounts: SocialAccount[] = data.user?.socialAccounts || [];
                const fbPages = accounts.filter((acc) => acc.provider === "facebook");
                setFacebookPages(fbPages);
                const defaultPage = fbPages.find((p) => p.isDefault) || fbPages[0] || null;
                setSelectedFacebookPageId(defaultPage?.id ?? null);
            } catch {
                // Ignore fetch errors
            }
        }

        fetchAccounts();
    }, []);

    useEffect(() => {
        if (!selectedPlatforms.includes("facebook")) return;
        if (selectedFacebookPageId) return;
        const defaultPage = facebookPages.find((p) => p.isDefault) || facebookPages[0] || null;
        setSelectedFacebookPageId(defaultPage?.id ?? null);
    }, [selectedPlatforms, facebookPages, selectedFacebookPageId]);

    async function onSave(data: MetadataFormValues, status: 'draft' | 'scheduled' = 'draft') {
        if (isSaving || isPublishing || isScheduling) return null;
        if (selectedPlatforms.length === 0) {
            toast.error("Please select at least one platform");
            return null;
        }
        if (selectedPlatforms.includes("facebook") && !selectedFacebookPageId) {
            toast.error("Please select a Facebook Page");
            return null;
        }

        setIsSaving(true);
        try {
            const platformAccounts = selectedPlatforms.includes("facebook") && selectedFacebookPageId
                ? { facebook: selectedFacebookPageId }
                : undefined;
            const res = await fetch("/api/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: data.title,
                    description: data.description,
                    mediaUrl: fileUrl,
                    mediaType,
                    scheduledAt: date,
                    status,
                    platforms: selectedPlatforms,
                    platformAccounts,
                }),
            });

            if (!res.ok) throw new Error("Failed to save content");

            const json = await res.json();
            setContentId(json.content.id);

            if (status === 'scheduled') {
                toast.success(`Content scheduled for ${date?.toLocaleString()}`);
                router.push("/dashboard");
            } else {
                toast.success("Draft saved successfully!");
            }
            return json.content.id;
        } catch (error) {
            toast.error("Error saving content");
            console.error(error);
            return null;
        } finally {
            setIsSaving(false);
        }
    }

    async function onSchedule() {
        if (isSaving || isPublishing || isScheduling) return;
        if (!date) {
            toast.error("Please select a date and time");
            return;
        }
        setIsScheduling(true);
        await handleSubmit((data) => onSave(data, 'scheduled'))();
        setIsScheduling(false);
    }

    async function onPublish() {
        if (isSaving || isPublishing || isScheduling) return;
        if (selectedPlatforms.length === 0) {
            toast.error("Please select at least one platform");
            return;
        }
        if (selectedPlatforms.includes("facebook") && !selectedFacebookPageId) {
            toast.error("Please select a Facebook Page");
            return;
        }

        let idToPublish = contentId;
        if (!idToPublish) {
            const isValid = await trigger();
            if (!isValid) {
                toast.error("Please fix validation errors");
                return;
            }
            const data = getValues();
            const savedId = await onSave(data);
            if (!savedId) {
                toast.error("Failed to save draft before publishing.");
                return;
            }
            idToPublish = savedId;
        }

        setIsPublishing(true);
        try {
            const res = await fetch(`/api/content/${idToPublish}/publish`, {
                method: "POST",
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to publish");
            }

            const result = await res.json();
            const successCount = result.results?.filter((r: { status: string }) => r.status === "success").length || 0;
            const failCount = result.results?.filter((r: { status: string }) => r.status === "failed").length || 0;

            if (failCount > 0 && successCount > 0) {
                toast.warning(`Published to ${successCount} platform(s), ${failCount} failed.`);
            } else if (failCount > 0) {
                toast.error("Failed to publish to all platforms.");
            } else {
                toast.success(`Published to ${successCount} platform(s) successfully!`);
            }
            router.push("/dashboard");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error publishing content");
        } finally {
            setIsPublishing(false);
        }
    }

    const isLoading = isSaving || isPublishing || isScheduling;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Content Details</CardTitle>
                <CardDescription>Enter details for your {mediaType} before publishing.</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" {...register("title")} />
                        {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" {...register("description")} />
                    </div>

                    <div className="space-y-2">
                        <Label>Publish to</Label>
                        <PlatformSelector
                            selected={selectedPlatforms}
                            onChange={setSelectedPlatforms}
                            mediaType={mediaType}
                        />
                        {selectedPlatforms.length === 0 && (
                            <p className="text-xs text-muted-foreground">Select at least one platform to publish to.</p>
                        )}
                    </div>

                    {selectedPlatforms.includes("facebook") && (
                        <div className="space-y-2">
                            <Label htmlFor="facebook-page">Facebook Page</Label>
                            {facebookPages.length > 0 ? (
                                <select
                                    id="facebook-page"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    value={selectedFacebookPageId ?? ""}
                                    onChange={(e) => setSelectedFacebookPageId(e.target.value)}
                                >
                                    {facebookPages.map((page) => {
                                        const label = page.name
                                            || [page.firstName, page.lastName].filter(Boolean).join(" ")
                                            || page.providerId;
                                        return (
                                            <option key={page.id} value={page.id}>
                                                {label}{page.isDefault ? " (default)" : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    No Facebook Pages connected.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Schedule (Optional)</Label>
                        <div className="flex flex-col gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[240px] justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                        disabled={(date) => date < new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                            {date && <p className="text-xs text-muted-foreground">Will be published on {format(date, "PPP")}</p>}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button onClick={handleSubmit((data) => onSave(data))} disabled={isLoading} variant="outline">
                            {isSaving ? "Saving..." : "Save Draft"}
                        </Button>

                        <Button
                            type="button"
                            disabled={!date || isLoading}
                            onClick={onSchedule}
                            variant="secondary"
                        >
                            {isScheduling ? "Scheduling..." : "Schedule"}
                        </Button>

                        <Button
                            type="button"
                            disabled={isLoading || selectedPlatforms.length === 0}
                            onClick={onPublish}
                            variant="default"
                        >
                            {isPublishing ? "Publishing..." : "Publish Now"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
