"use client";

import { useState } from "react";
import { UploadMedia } from "./upload-media";
import { PublishForm } from "./publish-form";
import type { MediaType } from "@/lib/platforms/types";

export function UploadFlow() {
    const [step, setStep] = useState<"upload" | "publish">("upload");
    const [fileData, setFileData] = useState<{ url: string; key: string; name: string; mediaType: MediaType } | null>(null);

    const handleUploadComplete = (url: string, key: string, name: string, mediaType: MediaType) => {
        setFileData({ url, key, name, mediaType });
        setStep("publish");
    };

    if (step === "publish" && fileData) {
        return (
            <PublishForm
                fileUrl={fileData.url}
                fileKey={fileData.key}
                fileName={fileData.name}
                mediaType={fileData.mediaType}
            />
        );
    }

    return <UploadMedia onUploadComplete={handleUploadComplete} />;
}
