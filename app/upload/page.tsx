import { UploadFlow } from "@/components/upload/upload-flow";
import { ContentNav } from "@/components/content/content-nav";
import { getAuthenticatedUser } from "@/lib/auth-user";

export default async function UploadPage() {
    await getAuthenticatedUser();

    return (
        <div className="min-h-screen">
            <ContentNav />
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="text-center">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Upload
                    </div>
                    <h1 className="font-display mt-3 text-4xl">
                        Drop it, detail it, release it.
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Add a file, set your details, and schedule your release.
                    </p>
                </div>
                <div className="mt-12 mx-auto max-w-xl">
                    <UploadFlow />
                </div>
            </div>
        </div>
    );
}
