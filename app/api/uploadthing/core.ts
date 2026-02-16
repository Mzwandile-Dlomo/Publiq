import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { verifySession } from "@/lib/auth";

const f = createUploadthing();

const authMiddleware = async () => {
    const session = await verifySession();
    if (!session) throw new UploadThingError("Unauthorized");
    return { userId: session.userId as string };
};

const onComplete = async ({ metadata, file }: { metadata: { userId: string }; file: { url: string; name: string; key: string } }) => {
    return { uploadedBy: metadata.userId, url: file.url, name: file.name, key: file.key };
};

export const ourFileRouter = {
    videoUploader: f({ video: { maxFileSize: "64MB", maxFileCount: 1 } })
        .middleware(authMiddleware)
        .onUploadComplete(onComplete),

    imageUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
        .middleware(authMiddleware)
        .onUploadComplete(onComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
