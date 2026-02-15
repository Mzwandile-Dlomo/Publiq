"use client";

import { useState } from "react";
import { UploadVideo } from "./upload-video";
import { PublishForm } from "./publish-form";

export function UploadFlow() {
    const [step, setStep] = useState<"upload" | "publish">("upload");
    const [fileData, setFileData] = useState<{ url: string; key: string; name: string } | null>(null);

    const handleUploadComplete = (url: string, key: string, name: string) => {
        setFileData({ url, key, name });
        setStep("publish");
    };

    if (step === "publish" && fileData) {
        return (
            <PublishForm
                fileUrl={fileData.url}
                fileKey={fileData.key}
                fileName={fileData.name}
            />
        );
    }

    return <UploadVideo onUploadComplete={handleUploadComplete} />;
}
