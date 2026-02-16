"use client";

import { useEffect, useState } from "react";
import type { AnalyticsResponse } from "@/lib/analytics-types";
import { StatCards } from "./stat-cards";
import { PlatformBreakdown } from "./platform-breakdown";
import { TopContent } from "./top-content";

export function AnalyticsDashboard() {
    const [data, setData] = useState<AnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const res = await fetch("/api/analytics");
                if (res.ok) {
                    const json: AnalyticsResponse = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        }
        fetchAnalytics();
    }, []);

    const totals = data?.totals ?? { views: 0, likes: 0, comments: 0 };

    return (
        <div className="space-y-10">
            <StatCards totals={totals} loading={loading} />
            <PlatformBreakdown
                platforms={data?.platforms ?? {}}
                totalViews={totals.views}
                loading={loading}
            />
            <TopContent items={data?.topContent ?? []} loading={loading} />
        </div>
    );
}
