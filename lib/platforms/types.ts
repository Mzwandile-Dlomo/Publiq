import type { Platform } from "./index";

export type MediaType = "video" | "image";

export interface PublishableContent {
    id: string;
    mediaUrl: string;
    mediaType: MediaType;
    title: string;
    description: string | null;
    socialAccountId?: string | null;
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
    getStats(
        userId: string,
        posts: { postId: string; socialAccountId?: string | null }[]
    ): Promise<Record<string, VideoStats>>;
}
