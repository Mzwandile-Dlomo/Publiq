    import Link from "next/link";
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
        <div className="bg-aurora bg-noise">
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 pt-8">
            <Link href="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-semibold">
                    P
                </div>
                <div className="leading-tight">
                    <div className="text-lg font-semibold">Publiq</div>
                    <div className="text-xs text-muted-foreground">Publish everywhere</div>
                </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
                <NavLink
                    href="/dashboard"
                    className="text-muted-foreground hover:text-foreground"
                    activeClassName="text-foreground"
                >
                    Dashboard
                </NavLink>
                <NavLink
                    href="/pricing"
                    className="text-muted-foreground hover:text-foreground"
                    activeClassName="text-foreground"
                >
                    Pricing
                </NavLink>
                {session ? (
                    <>
                        <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-4 py-2">
                            {user?.image ? (
                                <img
                                    src={user.image}
                                    alt={displayName}
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
                        </div>
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
        </div>
    );
}
