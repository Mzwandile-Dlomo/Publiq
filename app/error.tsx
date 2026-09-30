"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Something went wrong</p>
      <h1 className="font-display mt-3 text-4xl">We could not load this page.</h1>
      <p className="mt-4 text-muted-foreground">Your data is safe. Try the request again, or return in a moment.</p>
      <Button className="mt-6 rounded-full" onClick={reset}>Try again</Button>
    </main>
  );
}
