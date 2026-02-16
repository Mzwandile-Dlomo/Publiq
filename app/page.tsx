import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { SiteFooter } from "@/components/layout/site-footer";

export default async function Home() {
  const session = await verifySession();

  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
        <section className="mt-16 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Creator OS
            </span>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Plan, publish, and grow with one calm workspace.
            </h1>
            <p className="text-lg text-muted-foreground sm:text-xl">
              Publiq brings your uploads, schedules, and cross-platform analytics into a single, polished cockpit so
              every release lands on time and on brand.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {session ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    Go to dashboard
                  </Link>
                  <Link
                    href="/upload"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-border px-6 text-sm font-semibold text-foreground transition hover:border-foreground/40"
                  >
                    Upload content
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signup"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    Start for free
                  </Link>
                  <Link
                    href="/auth/login"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-border px-6 text-sm font-semibold text-foreground transition hover:border-foreground/40"
                  >
                    I already have an account
                  </Link>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="rounded-full bg-secondary px-3 py-1">Unified uploads</span>
              <span className="rounded-full bg-secondary px-3 py-1">Smart scheduling</span>
              <span className="rounded-full bg-secondary px-3 py-1">Channel analytics</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-primary/10 blur-3xl" />
            <div className="relative space-y-5 rounded-3xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Release week</span>
                <span>Feb 17 - Feb 23</span>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-white p-4">
                  <div className="text-sm font-semibold">Studio Session Recap</div>
                  <div className="text-xs text-muted-foreground">Scheduled · YouTube · Thu 2:00 PM</div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-4">
                  <div className="text-sm font-semibold">Behind the Mix</div>
                  <div className="text-xs text-muted-foreground">Queued · TikTok · Fri 6:30 PM</div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-4">
                  <div className="text-sm font-semibold">Creator Q&A</div>
                  <div className="text-xs text-muted-foreground">Draft · Instagram · Sun 11:00 AM</div>
                </div>
              </div>
              <div className="rounded-2xl bg-secondary p-4 text-xs text-muted-foreground">
                Next release window is 68% booked. Move dates to keep cadence.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Publish once",
              body: "Upload in one place and push to every channel without switching tabs.",
            },
            {
              title: "Keep a cadence",
              body: "Visual timelines make it easy to space releases and avoid overload.",
            },
            {
              title: "Measure what matters",
              body: "Consolidated analytics show reach, engagement, and follower growth.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="text-base font-semibold">{item.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-3xl border border-border bg-card p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Workflow
              </div>
              <h2 className="font-display mt-3 text-3xl">Ship every week without burning out.</h2>
              <p className="mt-4 text-sm text-muted-foreground">
                Draft, schedule, publish, and review performance in one flow. Publiq removes the brittle handoffs so
                creative time goes further.
              </p>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border bg-white p-4">Automated status updates per platform.</div>
              <div className="rounded-2xl border border-border bg-white p-4">Reliable uploads with retries and alerts.</div>
              <div className="rounded-2xl border border-border bg-white p-4">Team-ready views for editors and managers.</div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
