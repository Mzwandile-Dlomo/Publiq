"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
    { href: "/content", label: "All Content", key: "all" },
    { href: "/upload", label: "Upload / Create", key: "upload" },
    { href: "/schedule", label: "Scheduled", key: "scheduled" },
    // { href: "/content?filter=draft", label: "Drafts", key: "drafts" },
];

export function ContentNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const filter = searchParams.get("filter");

    const isActive = (key: string) => {
        if (key === "upload") return pathname === "/upload";
        if (key === "scheduled") return pathname === "/schedule";
        if (key === "drafts") return pathname === "/content" && filter === "draft";
        return pathname === "/content" && (!filter || filter === "all");
    };

    return (
        <div className="mx-auto max-w-6xl px-6 pt-6">
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-card/60 p-2">
                {links.map((link) => {
                    const active = isActive(link.key);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                                active
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {link.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
