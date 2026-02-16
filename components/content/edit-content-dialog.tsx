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
import { CalendarIcon } from "lucide-react";
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

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
