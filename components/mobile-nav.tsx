"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { NavLink } from "@/components/nav-link";

export function MobileNav({
    session,
    displayName,
    initials,
    userImage,
}: {
    session: boolean;
    displayName: string;
    initials: string;
    userImage?: string | null;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="md:hidden">
            <button
                onClick={() => setOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white/80 text-foreground"
                aria-label="Open menu"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="8" x2="20" y2="8" />
                    <line x1="4" y1="16" x2="20" y2="16" />
                </svg>
            </button>

            {open && createPortal(
                <div className="fixed inset-0 z-50 flex flex-col bg-aurora px-6 pt-8 pb-6 md:hidden">
                    <div className="flex items-center justify-between">
                        <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-semibold">
                                P
                            </div>
                            <div className="leading-tight">
                                <div className="text-lg font-semibold">Publiq</div>
                                <div className="text-xs text-muted-foreground">Publish everywhere</div>
                            </div>
                        </Link>
                        <button
                            onClick={() => setOpen(false)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white/80 text-foreground"
                            aria-label="Close menu"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                    <nav className="mt-10 flex flex-col items-center gap-4 text-sm font-medium">
                        <NavLink href="/dashboard" onClick={() => setOpen(false)} className="w-full rounded-xl px-3 py-3 text-center text-muted-foreground hover:bg-white/50 hover:text-foreground" activeClassName="bg-white/50 text-foreground">
                            Dashboard
                        </NavLink>
                        <NavLink href="/pricing" onClick={() => setOpen(false)} className="w-full rounded-xl px-3 py-3 text-center text-muted-foreground hover:bg-white/50 hover:text-foreground" activeClassName="bg-white/50 text-foreground">
                            Pricing
                        </NavLink>
                        <div className="my-1 h-px w-full bg-border" />
                        {session ? (
                            <>
                                <div className="flex items-center justify-center gap-3 px-3 py-2">
                                    {userImage ? (
                                        <img src={userImage} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                            {initials}
                                        </div>
                                    )}
                                    <span className="font-semibold">{displayName}</span>
                                </div>
                                <form action="/api/auth/logout" method="post" className="w-full">
                                    <button
                                        type="submit"
                                        className="w-full rounded-xl bg-primary px-3 py-3 text-center text-primary-foreground transition hover:opacity-90"
                                    >
                                        Log out
                                    </button>
                                </form>
                            </>
                        ) : (
                            <>
                                <Link href="/auth/login" onClick={() => setOpen(false)} className="w-full rounded-xl border border-border px-3 py-3 text-center text-foreground hover:border-foreground/50">
                                    Log in
                                </Link>
                                <Link href="/auth/signup" onClick={() => setOpen(false)} className="w-full rounded-xl bg-primary px-3 py-3 text-center text-primary-foreground transition hover:opacity-90">
                                    Get started
                                </Link>
                            </>
                        )}
                    </nav>
                </div>,
                document.body
            )}
        </div>
    );
}
