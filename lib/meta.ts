
export const META_CLIENT_ID = process.env.META_CLIENT_ID!;
export const META_CLIENT_SECRET = process.env.META_CLIENT_SECRET!;
export const META_REDIRECT_URI = process.env.META_REDIRECT_URI || "http://localhost:3000/api/auth/facebook/callback";

// Scopes required
// public_profile, email - Basic info
// pages_show_list, pages_read_engagement, pages_manage_posts - Facebook Pages
// instagram_basic, instagram_content_publish - Instagram Business
export const META_SCOPES = [
    "public_profile",
    "email",
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "instagram_basic",
    "instagram_content_publish"
];

export function getMetaAuthUrl() {
    const state = Math.random().toString(36).substring(7);
    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_CLIENT_ID}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&state=${state}&scope=${META_SCOPES.join(",")}`;
    return url;
}

export async function exchangeMetaCodeForToken(code: string) {
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${META_CLIENT_ID}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&client_secret=${META_CLIENT_SECRET}&code=${code}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }
    return data;
}

export async function getMetaUserInfo(accessToken: string) {
    const url = `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }
    return data;
}

export async function getFacebookPages(accessToken: string) {
    const url = `https://graph.facebook.com/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }
    return data.data;
}

export async function publishFacebookVideo(
    pageAccessToken: string,
    pageId: string,
    videoUrl: string,
    description: string
) {
    // 1. Initialize Upload (Post directly with file_url)
    const url = `https://graph.facebook.com/${pageId}/videos?access_token=${pageAccessToken}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            file_url: videoUrl,
            description: description,
        })
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message);
    }

    return { id: data.id };
}

export async function publishInstagramReel(
    pageAccessToken: string, // We use Page Token that has permissions for the linked IG account
    igUserId: string,
    videoUrl: string,
    caption: string
) {
    // 1. Create Media Container
    const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media?access_token=${pageAccessToken}`;

    const containerRes = await fetch(containerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            media_type: "REELS",
            video_url: videoUrl,
            caption: caption,
        })
    });

    const containerData = await containerRes.json();
    if (containerData.error) throw new Error(containerData.error.message);

    const containerId = containerData.id;

    // 2. Publish Container
    // We might need to wait for the container to be ready (status check), but for simple implementation we try publish.
    // Ideally we should poll status. For MVP let's assume valid URL works somewhat quickly or fails. 
    // Actually IG requires status check usually. 

    // Simple retry loop for status check
    let attempts = 0;
    while (attempts < 5) {
        const statusUrl = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${pageAccessToken}`;
        const statusRes = await fetch(statusUrl);
        const statusData = await statusRes.json();

        if (statusData.status_code === 'FINISHED') break;
        if (statusData.status_code === 'ERROR') throw new Error("IG Media container failed processing");

        await new Promise(r => setTimeout(r, 2000)); // Wait 2s
        attempts++;
    }

    const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish?access_token=${pageAccessToken}`;
    const publishRes = await fetch(publishUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            creation_id: containerId
        })
    });

    const publishData = await publishRes.json();
    if (publishData.error) throw new Error(publishData.error.message);

    return { id: publishData.id };
}
