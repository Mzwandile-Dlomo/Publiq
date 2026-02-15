import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteContentButton } from "@/components/dashboard/delete-content-button";
import { DashboardStats } from "@/components/analytics/dashboard-stats";

export default async function DashboardPage() {
    const session = await verifySession();

    if (!session) {
        redirect("/auth/login");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId as string },
        include: { socialAccounts: true },
    });

    const contentItems = await prisma.content.findMany({
        where: { userId: session.userId as string },
        include: { publications: true },
        orderBy: { createdAt: "desc" },
    });

    const youtubeAccount = user?.socialAccounts.find((acc) => acc.provider === "youtube");

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
                <p className="text-muted-foreground">Welcome, {user?.name || user?.email}</p>
                <div className="mt-4 flex gap-4">
                    <Link href="/upload">
                        <Button>Upload New Video</Button>
                    </Link>
                    <Link href="/pricing">
                        <Button variant="outline">Upgrade Plan</Button>
                    </Link>
                </div>
            </div>

            <DashboardStats />

            <div className="border p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Connected Accounts</h2>

                {youtubeAccount ? (
                    <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
                        <div className="font-medium">✅ YouTube Connected</div>
                        <div className="text-sm">({youtubeAccount.email})</div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <Link href="/api/auth/google/url">
                            <Button variant="outline" className="flex items-center gap-2">
                                Connect YouTube
                            </Button>
                        </Link>
                        <span className="text-sm text-muted-foreground">Authorize Publiq to upload videos.</span>
                    </div>
                )}
            </div>

            <div className="border p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Your Content</h2>

                {contentItems.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No content yet. Upload your first video!</p>
                ) : (
                    <div className="space-y-3">
                        {contentItems.map((item) => {
                            const publication = item.publications.find((p) => p.platform === "youtube");
                            return (
                                <div key={item.id} className="flex items-center justify-between p-4 border rounded">
                                    <div className="space-y-1">
                                        <p className="font-medium">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-1 rounded ${item.status === "published"
                                            ? "bg-green-100 text-green-700"
                                            : item.status === "scheduled"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-yellow-100 text-yellow-700"
                                            }`}>
                                            {item.status}
                                        </span>
                                        {publication?.platformPostId && (
                                            <a
                                                href={`https://youtube.com/watch?v=${publication.platformPostId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                View on YouTube
                                            </a>
                                        )}
                                        <DeleteContentButton contentId={item.id} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <form action="/api/auth/logout" method="post" className="mt-6">
                <Button type="submit" variant="secondary">
                    Logout
                </Button>
            </form>
        </div>
    );
}
