export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-[calc(100vh-72px)] items-center justify-center p-6">
            {children}
        </div>
    );
}
