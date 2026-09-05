"use client";

import type { TrendDataPoint } from "@/lib/analytics-types";

interface TrendChartProps {
    data: TrendDataPoint[];
    loading?: boolean;
    days: number;
}

const METRICS: { key: keyof Omit<TrendDataPoint, "date">; label: string; color: string }[] = [
    { key: "views", label: "Views", color: "#6366f1" },
    { key: "likes", label: "Likes", color: "#ec4899" },
    { key: "comments", label: "Comments", color: "#f59e0b" },
];

export function TrendChart({ data, loading, days }: TrendChartProps) {
    if (loading) {
        return <div className="h-56 animate-pulse rounded-2xl bg-muted" />;
    }

    const hasData = data.some((d) => d.views + d.likes + d.comments > 0);

    if (data.length === 0 || !hasData) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Performance Trend</h2>
                <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border">
                    <p className="text-sm text-muted-foreground">
                        No data in the last {days} days.
                    </p>
                </div>
            </div>
        );
    }

    const width = 800;
    const height = 200;
    const padL = 48;
    const padR = 16;
    const padT = 16;
    const padB = 32;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const maxVal = Math.max(
        ...data.flatMap((d) => [d.views, d.likes, d.comments]),
        1
    );

    function x(i: number) {
        return padL + (i / Math.max(data.length - 1, 1)) * chartW;
    }

    function y(val: number) {
        return padT + chartH - (val / maxVal) * chartH;
    }

    function buildPath(key: keyof Omit<TrendDataPoint, "date">) {
        if (data.length === 0) return "";
        return data.reduce((acc, point, i) => {
            const px = x(i);
            const py = y(point[key]);
            return acc + (i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`);
        }, "");
    }

    // Y-axis ticks
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxVal * f));

    // X-axis: show up to 6 evenly-spaced labels
    const xLabelIndices: number[] = [];
    const step = Math.max(1, Math.floor(data.length / 6));
    for (let i = 0; i < data.length; i += step) xLabelIndices.push(i);
    if (!xLabelIndices.includes(data.length - 1)) xLabelIndices.push(data.length - 1);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Performance Trend</h2>
                <div className="flex items-center gap-4">
                    {METRICS.map((m) => (
                        <span key={m.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: m.color }} />
                            {m.label}
                        </span>
                    ))}
                </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-4">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full"
                    aria-label="Analytics trend chart"
                    role="img"
                >
                    {/* Y-axis gridlines and labels */}
                    {yTicks.map((tick) => (
                        <g key={tick}>
                            <line
                                x1={padL}
                                y1={y(tick)}
                                x2={padL + chartW}
                                y2={y(tick)}
                                stroke="currentColor"
                                strokeOpacity={0.08}
                                strokeWidth={1}
                            />
                            <text
                                x={padL - 6}
                                y={y(tick) + 4}
                                textAnchor="end"
                                fontSize={10}
                                fill="currentColor"
                                opacity={0.4}
                            >
                                {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
                            </text>
                        </g>
                    ))}

                    {/* X-axis labels */}
                    {xLabelIndices.map((i) => (
                        <text
                            key={i}
                            x={x(i)}
                            y={height - 4}
                            textAnchor="middle"
                            fontSize={9}
                            fill="currentColor"
                            opacity={0.4}
                        >
                            {data[i].date.slice(5)} {/* MM-DD */}
                        </text>
                    ))}

                    {/* Lines */}
                    {METRICS.map((m) => (
                        <path
                            key={m.key}
                            d={buildPath(m.key)}
                            fill="none"
                            stroke={m.color}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
}
