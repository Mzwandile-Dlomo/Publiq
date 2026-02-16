import Link from "next/link";

export function SiteFooter() {
    return (
        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-border text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Publiq</span>
            <div className="flex items-center gap-4">
                <Link href="/terms" className="transition hover:text-foreground">
                    Terms
                </Link>
                <Link href="/privacy" className="transition hover:text-foreground">
                    Privacy
                </Link>
            </div>
        </footer>
    );
}
