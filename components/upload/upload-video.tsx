"use client";

import { UploadDropzone } from "@/lib/uploadthing";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface UploadVideoProps {
    onUploadComplete: (fileUrl: string, fileKey: string, fileName: string) => void;
}

export function UploadVideo({ onUploadComplete }: UploadVideoProps) {

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Upload Video</CardTitle>
                <CardDescription>
                    Drag &apos;n&apos; drop some files here, or click to select files
                </CardDescription>
            </CardHeader>
            <CardContent>
                <UploadDropzone
                    endpoint="videoUploader"
                    onClientUploadComplete={(res) => {
                        // Do something with the response
                        console.log("Files: ", res);
                        if (res && res.length > 0) {
                            const file = res[0];
                            toast.success("Upload completed!");
                            onUploadComplete(file.url, file.key, file.name);
                        }
                    }}
                    onUploadError={(error: Error) => {
                        // Do something with the error.
                        toast.error(error.message);
                    }}
                />
            </CardContent>
        </Card>
    );
}
