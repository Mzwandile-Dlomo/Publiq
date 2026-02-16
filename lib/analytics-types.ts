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

export interface AnalyticsResponse {
    totals: { views: number; likes: number; comments: number };
    platforms: Partial<Record<Platform, PlatformStats>>;
    topContent: TopContentItem[];
}
