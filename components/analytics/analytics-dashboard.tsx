"use client";

import { useState, useEffect, useTransition } from "react";
import { Download, Calendar } from "lucide-react";
import type { AnalyticsResponse } from "@/lib/analytics-types";
import { StatCards } from "./stat-cards";
import { PlatformBreakdown } from "./platform-breakdown";
import { TopContent } from "./top-content";
import { TrendChart } from "./trend-chart";

const RANGE_OPTIONS = [
    { label: "7 days", days: 7 },
    { label: "30 days", days: 30 },
    { label: "90 days", days: 90 },
];

interface AnalyticsDashboardProps {
    data: AnalyticsResponse;
}

export function AnalyticsDashboard({ data: initialData }: AnalyticsDashboardProps) {
    const [data, setData] = useState(initialData);
    const [rangeDays, setRangeDays] = useState(30);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const to = new Date();
            const from = new Date(to.getTime() - rangeDays * 24 * 60 * 60 * 1000);
            const res = await fetch(
                `/api/analytics?from=${from.toISOString()}&to=${to.toISOString()}`
            );
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        });
    }, [rangeDays]);

    function handleExport() {
        const to = new Date();
        const from = new Date(to.getTime() - rangeDays * 24 * 60 * 60 * 1000);
        const url = `/api/analytics?from=${from.toISOString()}&to=${to.toISOString()}&export=csv`;
        window.open(url, "_blank");
    }

    return (
        <div className="space-y-10">
            {/* Controls: date range + export */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex gap-1">
                        {RANGE_OPTIONS.map((opt) => (
                            <button
                                key={opt.days}
                                onClick={() => setRangeDays(opt.days)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                    rangeDays === opt.days
                                        ? "bg-primary text-primary-foreground"
                                        : "border border-border bg-card text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                </button>
            </div>

            <StatCards totals={data.totals} loading={isPending} />

            {/* Trend chart */}
            <TrendChart data={data.trend} loading={isPending} days={rangeDays} />

            <PlatformBreakdown
                platforms={data.platforms}
                totalViews={data.totals.views}
                loading={isPending}
            />
            <TopContent items={data.topContent} loading={isPending} />
        </div>
    );
}
