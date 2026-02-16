export const PLATFORMS = ["youtube", "tiktok", "instagram", "facebook"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type MediaType = "video" | "image";

export interface PlatformConfig {
    id: Platform;
    name: string;
    icon: string; // Lucide icon name
    color: string; // Tailwind color class
    bgColor: string;
    borderColor: string;
    description: string;
    connectUrl: string; // OAuth entry point
    /** Whether this platform's integration is fully implemented */
    available: boolean;
    supportedMediaTypes: MediaType[];
}

export const platformConfigs: Record<Platform, PlatformConfig> = {
    youtube: {
        id: "youtube",
        name: "YouTube",
        icon: "Youtube",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        description: "Upload videos and track performance on YouTube.",
        connectUrl: "/api/auth/google/url",
        available: true,
        supportedMediaTypes: ["video"],
    },
    tiktok: {
        id: "tiktok",
        name: "TikTok",
        icon: "Music2",
        color: "text-gray-900",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        description: "Share short-form videos on TikTok.",
        connectUrl: "/api/auth/tiktok/url",
        available: true,
        supportedMediaTypes: ["video"],
    },
    instagram: {
        id: "instagram",
        name: "Instagram",
        icon: "Instagram",
        color: "text-pink-600",
        bgColor: "bg-pink-50",
        borderColor: "border-pink-200",
        description: "Post photos, Reels, and videos to Instagram.",
        connectUrl: "/api/auth/instagram/url",
        available: true,
        supportedMediaTypes: ["video", "image"],
    },
    facebook: {
        id: "facebook",
        name: "Facebook",
        icon: "Facebook",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        description: "Publish photos and videos to your Facebook page.",
        connectUrl: "/api/auth/facebook/url",
        available: true,
        supportedMediaTypes: ["video", "image"],
    },
};

export function getPlatformConfig(platform: string): PlatformConfig | undefined {
    return platformConfigs[platform as Platform];
}

export function getAvailablePlatforms(): PlatformConfig[] {
    return PLATFORMS.map((p) => platformConfigs[p]).filter((c) => c.available);
}

export function getAllPlatforms(): PlatformConfig[] {
    return PLATFORMS.map((p) => platformConfigs[p]);
}

/** Returns the external URL for a published post on a given platform */
export function getPlatformPostUrl(platform: Platform, postId: string): string | null {
    switch (platform) {
        case "youtube":
            return `https://youtube.com/watch?v=${postId}`;
        case "tiktok":
            return `https://tiktok.com/@user/video/${postId}`;
        case "instagram":
            return `https://instagram.com/reel/${postId}`;
        case "facebook":
            return `https://facebook.com/${postId}`;
        default:
            return null;
    }
}
