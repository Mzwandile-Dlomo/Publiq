import type { Platform } from "./index";

export interface PublishableContent {
    id: string;
    videoUrl: string;
    title: string;
    description: string | null;
}

export interface PublishResult {
    platformPostId: string;
    publishedAt: Date;
}

export interface VideoStats {
    views: number;
    likes: number;
    comments: number;
}

export interface PlatformPublisher {
    platform: Platform;
    publish(userId: string, content: PublishableContent): Promise<PublishResult>;
}

export interface PlatformStatsProvider {
    platform: Platform;
    getStats(userId: string, platformPostIds: string[]): Promise<Record<string, VideoStats>>;
}
