"use client";

import { useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/platforms/types";

interface UploadMediaProps {
    onUploadComplete: (fileUrl: string, fileName: string, mediaType: MediaType) => void;
}

export function UploadMedia({ onUploadComplete }: UploadMediaProps) {
    const [mediaType, setMediaType] = useState<MediaType>("video");

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Upload Content</CardTitle>
                <CardDescription>
                    Select your media type and upload a file.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid w-full grid-cols-2 gap-2 rounded-lg border border-border p-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "rounded-md",
                            mediaType === "video" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                        )}
                        onClick={() => setMediaType("video")}
                    >
                        Video
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "rounded-md",
                            mediaType === "image" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                        )}
                        onClick={() => setMediaType("image")}
                    >
                        Image
                    </Button>
                </div>

                <UploadDropzone
                    endpoint={mediaType === "video" ? "videoUploader" : "imageUploader"}
                    onClientUploadComplete={(res) => {
                        if (res && res.length > 0) {
                            const file = res[0];
                            toast.success("Upload completed!");
                            onUploadComplete(file.url, file.name, mediaType);
                        }
                    }}
                    onUploadError={(error: Error) => {
                        toast.error(error.message);
                    }}
                />
            </CardContent>
        </Card>
    );
}
