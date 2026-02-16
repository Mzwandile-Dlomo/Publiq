import { BottomNav } from "@/components/dashboard/bottom-nav";

export default function AnalyticsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <main className="flex-1 pb-24 md:pb-0">
                {children}
            </main>

            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
}
