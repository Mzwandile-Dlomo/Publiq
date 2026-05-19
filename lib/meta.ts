
export const META_CLIENT_ID = process.env.META_CLIENT_ID!;
export const META_CLIENT_SECRET = process.env.META_CLIENT_SECRET!;
export const META_REDIRECT_URI = process.env.META_REDIRECT_URI || "http://localhost:3000/api/auth/facebook/callback";

// Scopes required
// public_profile, email - Basic info
// pages_show_list, pages_read_engagement, pages_manage_posts - Facebook Pages
// pages_read_user_content - Read comments/reactions on Page posts
// read_insights - Read video views and post impressions
// instagram_basic, instagram_content_publish - Instagram Business
export const META_SCOPES = [
    "public_profile",
    "email",
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "pages_read_user_content",
    "read_insights",
    "instagram_basic",
    "instagram_content_publish"
];

export function getMetaAuthUrl(redirectUri?: string) {
    const state = Math.random().toString(36).substring(7);
    const uri = redirectUri || META_REDIRECT_URI;
    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_CLIENT_ID}&redirect_uri=${encodeURIComponent(uri)}&state=${state}&scope=${META_SCOPES.join(",")}`;
    return url;
}

export async function exchangeMetaCodeForToken(code: string, redirectUri?: string) {
    const uri = redirectUri || META_REDIRECT_URI;
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${META_CLIENT_ID}&redirect_uri=${encodeURIComponent(uri)}&client_secret=${META_CLIENT_SECRET}&code=${code}`;

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

    // Prefer post_id (the page post) over id (the video object) for engagement tracking
    return { id: data.post_id || data.id };
}

export async function publishFacebookPhoto(
    pageAccessToken: string,
    pageId: string,
    imageUrl: string,
    caption: string
) {
    const url = `https://graph.facebook.com/${pageId}/photos?access_token=${pageAccessToken}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            url: imageUrl,
            message: caption,
        })
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message);
    }

    // Prefer post_id (the page post) over id (the photo object) for engagement tracking
    return { id: data.post_id || data.id };
}

export async function deleteFromFacebook(
    pageAccessToken: string,
    postId: string
) {
    const url = `https://graph.facebook.com/v19.0/${postId}?access_token=${pageAccessToken}`;
    const response = await fetch(url, { method: "DELETE" });
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    return data;
}

export async function publishInstagramImage(
    pageAccessToken: string,
    igUserId: string,
    imageUrl: string,
    caption: string
) {
    // 1. Create Media Container for IMAGE
    const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media?access_token=${pageAccessToken}`;

    const containerRes = await fetch(containerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            image_url: imageUrl,
            caption: caption,
        })
    });

    const containerData = await containerRes.json();
    if (containerData.error) throw new Error(containerData.error.message);

    const containerId = containerData.id;

    // 2. Publish Container
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

export async function publishInstagramReel(
    pageAccessToken: string,
    igUserId: string,
    videoUrl: string,
    caption: string
) {
    // 1. Create Media Container for REELS
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

    // 2. Poll until container is FINISHED (or fail)
    const statusUrl = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${pageAccessToken}`;
    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();

    if (statusData.status_code !== "FINISHED") {
        throw new Error("IG Media container failed processing");
    }

    // 3. Publish Container
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

/**
 * Reply to a comment on a Facebook Page post.
 * Requires pages_manage_posts + pages_read_user_content permissions.
 */
export async function replyToFacebookComment(
    pageAccessToken: string,
    commentId: string,
    message: string
): Promise<{ id: string }> {
    const url = `https://graph.facebook.com/v21.0/${commentId}/comments?access_token=${pageAccessToken}`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { id: data.id };
}

/**
 * Reply to a comment on an Instagram Business media.
 * Requires instagram_manage_comments permission.
 */
export async function replyToInstagramComment(
    accessToken: string,
    commentId: string,
    message: string
): Promise<{ id: string }> {
    const url = `https://graph.facebook.com/v19.0/${commentId}/replies?access_token=${accessToken}`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { id: data.id };
}
