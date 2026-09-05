import type { Platform } from "@/lib/platforms";

export interface PlatformStats {
    views: number;
    likes: number;
    comments: number;
    publicationCount: number;
}

export interface TopContentItem {
    publicationId: string;
    contentId: string;
    title: string;
    platform: Platform;
    views: number;
    likes: number;
    comments: number;
    publishedAt: string | null;
    platformPostId: string | null;
}

/** A single data point for the trend chart — one entry per day */
export interface TrendDataPoint {
    date: string; // ISO date string "YYYY-MM-DD"
    views: number;
    likes: number;
    comments: number;
}

export interface AnalyticsResponse {
    totals: { views: number; likes: number; comments: number };
    platforms: Partial<Record<Platform, PlatformStats>>;
    topContent: TopContentItem[];
    /** Daily trend data for the selected range */
    trend: TrendDataPoint[];
}
