"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Send } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const editSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

type ContentItem = {
    id: string;
    title: string;
    description: string | null;
    status: string;
    scheduledAt: string | null;
    publications?: { id: string; platform: string; status: string }[];
};

export function EditContentDialog({
    item,
    onClose,
}: {
    item: ContentItem | null;
    onClose: () => void;
}) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [date, setDate] = useState<Date | undefined>(undefined);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<EditFormValues>({
        resolver: zodResolver(editSchema),
    });

    useEffect(() => {
        if (item) {
            reset({
                title: item.title,
                description: item.description ?? "",
            });
            setDate(item.scheduledAt ? new Date(item.scheduledAt) : undefined);
        }
    }, [item, reset]);

    const hasPendingPublications = item?.publications?.some(
        (p) => p.status === "pending"
    );

    async function onSave(data: EditFormValues) {
        if (!item) return;

        setIsSaving(true);
        try {
            const status = date ? "scheduled" : "draft";
            const res = await fetch(`/api/content/${item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: data.title,
                    description: data.description,
                    scheduledAt: date?.toISOString() ?? null,
                    status,
                }),
            });

            if (!res.ok) throw new Error("Failed to update");

            toast.success("Content updated");
            onClose();
            router.refresh();
        } catch {
            toast.error("Failed to update content");
        } finally {
            setIsSaving(false);
        }
    }

    async function onPublish() {
        if (!item) return;

        setIsPublishing(true);
        try {
            const res = await fetch(`/api/content/${item.id}/publish`, {
                method: "POST",
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Failed to publish");
            }

            const { results } = await res.json();
            const succeeded = results.filter((r: { status: string }) => r.status === "success").length;
            const failed = results.filter((r: { status: string }) => r.status === "failed").length;

            if (failed === 0) {
                toast.success(`Published to ${succeeded} platform${succeeded === 1 ? "" : "s"}`);
            } else if (succeeded > 0) {
                toast.warning(`Published to ${succeeded}, failed on ${failed} platform${failed === 1 ? "" : "s"}`);
            } else {
                toast.error("Publishing failed on all platforms");
            }

            onClose();
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to publish");
        } finally {
            setIsPublishing(false);
        }
    }

    return (
        <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit content</DialogTitle>
                    <DialogDescription>
                        Update the title, description, or schedule date.
                    </DialogDescription>
                </DialogHeader>

                <form
                    className="space-y-4"
                    onSubmit={handleSubmit(onSave)}
                >
                    <div className="space-y-2">
                        <Label htmlFor="edit-title">Title</Label>
                        <Input id="edit-title" {...register("title")} />
                        {errors.title && (
                            <p className="text-sm text-red-500">{errors.title.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea id="edit-description" {...register("description")} />
                    </div>

                    <div className="space-y-2">
                        <Label>Schedule date</Label>
                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(
                                            "w-[240px] justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : "No date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        disabled={(d) => d < new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                            {date && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDate(undefined)}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSaving || isPublishing}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving || isPublishing}>
                            {isSaving ? "Saving..." : "Save changes"}
                        </Button>
                        {hasPendingPublications && (
                            <Button
                                type="button"
                                onClick={onPublish}
                                disabled={isSaving || isPublishing}
                                className="gap-2"
                            >
                                <Send className="h-3.5 w-3.5" />
                                {isPublishing ? "Publishing..." : "Publish now"}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
