import { UploadFlow } from "@/components/upload/upload-flow";
import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function UploadPage() {
    const session = await verifySession();

    if (!session) {
        redirect("/auth/login");
    }

    return (
        <div className="container mx-auto py-10">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
                &larr; Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold mb-6 mt-2">Upload Content</h1>
            <div className="max-w-xl mx-auto">
                <UploadFlow />
            </div>
        </div>
    );
}
