import type { Platform } from "./index";
import type { PlatformPublisher, PlatformStatsProvider, PlatformCommentsProvider } from "./types";

async function loadPlatformModule(platform: Platform) {
    switch (platform) {
        case "youtube":
            return import("./youtube");
        case "tiktok":
            return import("./tiktok");
        case "instagram":
            return import("./instagram");
        case "facebook":
            return import("./facebook");
    }
}

export async function getPublisher(platform: Platform): Promise<PlatformPublisher> {
    const mod = await loadPlatformModule(platform);
    const publisher = mod[`${platform}Publisher` as keyof typeof mod] as PlatformPublisher | undefined;
    if (!publisher) {
        throw new Error(`No publisher registered for platform: ${platform}`);
    }
    return publisher;
}

export async function getStatsProvider(platform: Platform): Promise<PlatformStatsProvider> {
    const mod = await loadPlatformModule(platform);
    const provider = mod[`${platform}StatsProvider` as keyof typeof mod] as PlatformStatsProvider | undefined;
    if (!provider) {
        throw new Error(`No stats provider registered for platform: ${platform}`);
    }
    return provider;
}

export async function getCommentsProvider(platform: Platform): Promise<PlatformCommentsProvider> {
    const mod = await loadPlatformModule(platform);
    const provider = mod[`${platform}CommentsProvider` as keyof typeof mod] as PlatformCommentsProvider | undefined;
    if (!provider) {
        throw new Error(`No comments provider registered for platform: ${platform}`);
    }
    return provider;
}
