"use client";

import { useState } from "react";
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

const metadataSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
});

type MetadataFormValues = z.infer<typeof metadataSchema>;

interface PublishFormProps {
    fileUrl: string;
    fileKey: string;
    fileName: string;
}

export function PublishForm({ fileUrl, fileKey, fileName }: PublishFormProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [contentId, setContentId] = useState<string | null>(null);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);

    const { register, handleSubmit, trigger, getValues, formState: { errors } } = useForm<MetadataFormValues>({
        resolver: zodResolver(metadataSchema),
        defaultValues: {
            title: fileName.split(".").slice(0, -1).join(".") || fileName,
            description: "",
        },
    });

    async function onSave(data: MetadataFormValues, status: 'draft' | 'scheduled' = 'draft') {
        if (selectedPlatforms.length === 0) {
            toast.error("Please select at least one platform");
            return null;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: data.title,
                    description: data.description,
                    videoUrl: fileUrl,
                    scheduledAt: date,
                    status,
                    platforms: selectedPlatforms,
                }),
            });

            if (!res.ok) throw new Error("Failed to save content");

            const json = await res.json();
            setContentId(json.content.id);

            if (status === 'scheduled') {
                toast.success(`Video scheduled for ${date?.toLocaleString()}`);
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
        if (!date) {
            toast.error("Please select a date and time");
            return;
        }
        setIsScheduling(true);
        await handleSubmit((data) => onSave(data, 'scheduled'))();
        setIsScheduling(false);
    }

    async function onPublish() {
        if (selectedPlatforms.length === 0) {
            toast.error("Please select at least one platform");
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
            const successCount = result.results?.filter((r: any) => r.status === "success").length || 0;
            const failCount = result.results?.filter((r: any) => r.status === "failed").length || 0;

            if (failCount > 0 && successCount > 0) {
                toast.warning(`Published to ${successCount} platform(s), ${failCount} failed.`);
            } else if (failCount > 0) {
                toast.error("Failed to publish to all platforms.");
            } else {
                toast.success(`Published to ${successCount} platform(s) successfully!`);
            }
            router.push("/dashboard");
        } catch (error: any) {
            toast.error(error.message || "Error publishing video");
        } finally {
            setIsPublishing(false);
        }
    }

    const isLoading = isSaving || isPublishing || isScheduling;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Video Details</CardTitle>
                <CardDescription>Enter details for your video before publishing.</CardDescription>
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
                        />
                        {selectedPlatforms.length === 0 && (
                            <p className="text-xs text-muted-foreground">Select at least one platform to publish to.</p>
                        )}
                    </div>

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
