"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function DeleteContentButton({ contentId }: { contentId: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [open, setOpen] = useState(false);
    const router = useRouter();

    async function handleDelete() {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/content/${contentId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("Content deleted");
            setOpen(false);
            router.refresh();
        } catch {
            toast.error("Failed to delete content");
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    Delete
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete content?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently remove this content from your dashboard. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
