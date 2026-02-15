import { UploadFlow } from "@/components/upload/upload-flow";
import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UploadPage() {
    const session = await verifySession();

    if (!session) {
        redirect("/auth/login");
    }

    return (
        <div className="bg-aurora bg-noise min-h-screen">
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-sm">
                    <h1 className="text-3xl font-semibold">Upload Content</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Drop a file, set your details, and schedule your release.
                    </p>
                    <div className="mt-6 mx-auto max-w-xl">
                        <UploadFlow />
                    </div>
                </div>
            </div>
        </div>
    );
}
