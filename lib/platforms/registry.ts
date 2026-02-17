import type { Platform } from "./index";
import type { PlatformPublisher, PlatformStatsProvider, PlatformCommentsProvider } from "./types";
import { youtubePublisher, youtubeStatsProvider, youtubeCommentsProvider } from "./youtube";
import { tiktokPublisher, tiktokStatsProvider, tiktokCommentsProvider } from "./tiktok";
import { instagramPublisher, instagramStatsProvider, instagramCommentsProvider } from "./instagram";
import { facebookPublisher, facebookStatsProvider, facebookCommentsProvider } from "./facebook";

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

const commentsProviders: Record<Platform, PlatformCommentsProvider> = {
    youtube: youtubeCommentsProvider,
    tiktok: tiktokCommentsProvider,
    instagram: instagramCommentsProvider,
    facebook: facebookCommentsProvider,
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

export function getCommentsProvider(platform: Platform): PlatformCommentsProvider {
    const provider = commentsProviders[platform];
    if (!provider) {
        throw new Error(`No comments provider registered for platform: ${platform}`);
    }
    return provider;
}
