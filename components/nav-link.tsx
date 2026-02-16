"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
    href,
    children,
    className,
    activeClassName,
    onClick,
    activePaths,
}: {
    href: string;
    children: React.ReactNode;
    className: string;
    activeClassName: string;
    onClick?: () => void;
    activePaths?: string[];
}) {
    const pathname = usePathname();
    const isActive = pathname === href
        || pathname.startsWith(href + "/")
        || (activePaths ?? []).some((path) => pathname === path || pathname.startsWith(path + "/"));

    return (
        <Link
            href={href}
            onClick={onClick}
            className={isActive ? activeClassName : className}
        >
            {children}
        </Link>
    );
}
