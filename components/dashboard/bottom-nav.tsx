"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Upload,
    Calendar,
    BarChart2,
    Settings,
} from "lucide-react";

export function BottomNav() {
    const pathname = usePathname();

    const links = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/schedule", label: "Schedule", icon: Calendar },
        { href: "/upload", label: "Upload", icon: Upload }, // Center item
        { href: "/analytics", label: "Analytics", icon: BarChart2 },
        { href: "/settings", label: "Settings", icon: Settings },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border lg:hidden pb-safe">
            <div className="flex items-center justify-around h-16">
                {links.map((link, index) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    const isCenter = index === 2; // Upload button

                    if (isCenter) {
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="relative -top-5"
                            >
                                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95">
                                    <Icon className="w-6 h-6" />
                                </div>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-medium transition-colors",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("w-5 h-5", isActive && "fill-current/20")} />
                            {link.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
