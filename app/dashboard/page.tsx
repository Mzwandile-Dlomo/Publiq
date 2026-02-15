import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
    const session = await verifySession();

    if (!session) {
        redirect("/auth/login");
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
            <p>Welcome, User {session.userId}</p>
            <form action="/api/auth/logout" method="post" className="mt-6">
                <Button type="submit" variant="secondary">
                    Logout
                </Button>
            </form>
        </div>
    );
}
