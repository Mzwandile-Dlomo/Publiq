import Link from "next/link";
import Image from "next/image";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MobileNav } from "@/components/mobile-nav";
import { NavLink } from "@/components/nav-link";

export async function Navbar() {
    const session = await verifySession();
    const user = session
        ? await prisma.user.findUnique({ where: { id: session.userId as string } })
        : null;

    const displayName = user?.name || user?.email || "Creator";
    const initials = displayName
        .split(" ")
        .map((part: string) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8">
            <Link href="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-semibold">
                    P
                </div>
                <div className="leading-tight">
                    <div className="text-lg font-semibold">Publiq</div>
                    <div className="text-xs text-muted-foreground">Publish everywhere</div>
                </div>
            </Link>

            {/* Desktop nav – visible md+ only */}
            <nav className="desktop-only items-center gap-5 text-sm font-medium">
                {session ? (
                    <>
                        <NavLink
                            href="/dashboard"
                            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                            activeClassName="rounded-full px-3 py-1.5 bg-secondary text-foreground font-semibold"
                        >
                            Dashboard
                        </NavLink>
                        <NavLink
                            href="/content"
                            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                            activeClassName="rounded-full px-3 py-1.5 bg-secondary text-foreground font-semibold"
                            activePaths={["/upload", "/schedule"]}
                        >
                            Content
                        </NavLink>
                        <NavLink
                            href="/analytics"
                            className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                            activeClassName="rounded-full px-3 py-1.5 bg-secondary text-foreground font-semibold"
                        >
                            Analytics
                        </NavLink>
                    </>
                ) : null}
                {session ? (
                    <>
                        <Link href="/settings" className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 hover:border-foreground/20 transition-colors">
                            {user?.image ? (
                                <Image
                                    src={user.image}
                                    alt={displayName}
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    {initials}
                                </div>
                            )}
                            <div className="text-left">
                                <div className="text-sm font-semibold">{displayName}</div>
                            </div>
                        </Link>
                        <form action="/api/auth/logout" method="post">
                            <button
                                type="submit"
                                className="rounded-full bg-primary px-5 py-2 text-primary-foreground transition hover:opacity-90"
                            >
                                Log out
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <Link
                            href="/auth/login"
                            className="rounded-full border border-border px-4 py-2 text-foreground transition hover:border-foreground/50"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/auth/signup"
                            className="rounded-full bg-primary px-5 py-2 text-primary-foreground transition hover:opacity-90"
                        >
                            Get started
                        </Link>
                    </>
                )}
            </nav>

            {/* Mobile nav */}
            <MobileNav
                session={!!session}
                displayName={displayName}
                initials={initials}
                userImage={user?.image}
            />
        </header>
    );
}
