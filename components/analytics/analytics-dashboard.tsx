import type { AnalyticsResponse } from "@/lib/analytics-types";
import { StatCards } from "./stat-cards";
import { PlatformBreakdown } from "./platform-breakdown";
import { TopContent } from "./top-content";

interface AnalyticsDashboardProps {
    data: AnalyticsResponse;
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
    return (
        <div className="space-y-10">
            <StatCards totals={data.totals} />
            <PlatformBreakdown
                platforms={data.platforms}
                totalViews={data.totals.views}
            />
            <TopContent items={data.topContent} />
        </div>
    );
}
