import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">404</p>
      <h1 className="font-display mt-3 text-4xl">This page is not here.</h1>
      <p className="mt-4 text-muted-foreground">The link may be outdated, or the page may have moved.</p>
      <Button asChild className="mt-6 rounded-full"><Link href="/">Go home</Link></Button>
    </main>
  );
}
