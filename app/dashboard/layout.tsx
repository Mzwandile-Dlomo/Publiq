export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-24 md:pb-8">
                {children}
            </main>
        </div>
    );
}
