import type { Platform } from "./index";
import type { PlatformPublisher, PlatformStatsProvider } from "./types";
import { youtubePublisher, youtubeStatsProvider } from "./youtube";
import { tiktokPublisher, tiktokStatsProvider } from "./tiktok";
import { instagramPublisher, instagramStatsProvider } from "./instagram";
import { facebookPublisher, facebookStatsProvider } from "./facebook";

const publishers: Record<Platform, PlatformPublisher> = {
    youtube: youtubePublisher,
    tiktok: tiktokPublisher,
    instagram: instagramPublisher,
    facebook: facebookPublisher,
};

const statsProviders: Record<Platform, PlatformStatsProvider> = {
    youtube: youtubeStatsProvider,
    tiktok: tiktokStatsProvider,
    instagram: instagramStatsProvider,
    facebook: facebookStatsProvider,
};

export function getPublisher(platform: Platform): PlatformPublisher {
    const publisher = publishers[platform];
    if (!publisher) {
        throw new Error(`No publisher registered for platform: ${platform}`);
    }
    return publisher;
}

export function getStatsProvider(platform: Platform): PlatformStatsProvider {
    const provider = statsProviders[platform];
    if (!provider) {
        throw new Error(`No stats provider registered for platform: ${platform}`);
    }
    return provider;
}
