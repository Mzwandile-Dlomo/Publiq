
export const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
export const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;
export const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || "http://localhost:3000/api/auth/tiktok/callback";

// Scopes required for uploading video
// Reference: https://developers.tiktok.com/doc/tiktok-api-scopes/
// user.info.basic - to get user profile (avatar, name)
// video.upload - to upload videos (if available in direct post or via webhooks)
// Note: TikTok API scopes might vary based on the specific API version (Research/Display vs Content Posting).
// For Content Posting API: 'user.info.profile', 'video.publish' might be used.
// We will use standard ones and adjust if needed.

const SCOPES = [
    "user.info.basic",
    "video.upload", // Check if this is the correct scope for the specific API we are using
    "video.publish"
];

export function getTikTokAuthUrl() {
    const csrfState = Math.random().toString(36).substring(7);
    const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&scope=${SCOPES.join(",")}&response_type=code&redirect_uri=${encodeURIComponent(TIKTOK_REDIRECT_URI)}&state=${csrfState}`;
    return url;
}


export async function exchangeTikTokCodeForToken(code: string) {
    const url = "https://open.tiktokapis.com/v2/oauth/token/";

    const params = new URLSearchParams();
    params.append("client_key", TIKTOK_CLIENT_KEY);
    params.append("client_secret", TIKTOK_CLIENT_SECRET);
    params.append("code", code);
    params.append("grant_type", "authorization_code");
    params.append("redirect_uri", TIKTOK_REDIRECT_URI);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cache-Control": "no-cache",
        },
        body: params,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("TikTok Token Exchange Error:", errorText);
        throw new Error(`Failed to exchange token: ${errorText}`);
    }

    return response.json();
}

export async function getTikTokUserInfo(accessToken: string) {
    // https://developers.tiktok.com/doc/tiktok-api-v2-user-info/
    const url = "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name";

    const response = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("TikTok User Info Error:", errorText);
        throw new Error(`Failed to get user info: ${errorText}`);
    }

    const data = await response.json();
    return data.data; // TikTok wraps response in 'data' object
}

export async function uploadToTikTok(
    accessToken: string,
    fileUrl: string,
    title: string // TikTok uses title as description constraint 2200 chars
) {
    // 1. Init Upload
    const initUrl = "https://open.tiktokapis.com/v2/post/publish/video/init/";

    // We need to fetch the file size first
    const fileRes = await fetch(fileUrl, { method: 'HEAD' });
    const totalBytes = fileRes.headers.get('content-length');

    if (!totalBytes) throw new Error("Could not determine file size");

    const initRes = await fetch(initUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
            post_info: {
                title: title.substring(0, 2200), // Limit
                privacy_level: "PUBLIC_TO_EVERYONE",
                disable_duet: false,
                disable_comment: false,
                disable_stitch: false,
                video_cover_timestamp_ms: 0,
            },
            source_info: {
                source: "FILE_UPLOAD",
                video_size: parseInt(totalBytes),
                chunk_size: parseInt(totalBytes), // Simple single chunk for now
                total_chunk_count: 1,
            },
        }),
    });

    if (!initRes.ok) {
        const errorText = await initRes.text();
        throw new Error(`TikTok Init Upload Failed: ${errorText}`);
    }

    const initData = await initRes.json();
    const uploadUrl = initData.data.upload_url;
    const publishId = initData.data.publish_id;

    // 2. Upload Video File
    // Fetch the actual file stream buffer
    const fileStreamRes = await fetch(fileUrl);
    const fileBuffer = await fileStreamRes.arrayBuffer();

    const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "video/mp4", // Assessing MP4
            "Content-Range": `bytes 0-${parseInt(totalBytes) - 1}/${totalBytes}`,
            "Content-Length": totalBytes,
        },
        body: fileBuffer,
    });

    if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`TikTok Video Upload Failed: ${errorText}`);
    }

    // TikTok automatically finishes/processes after upload for FILE_UPLOAD source usually, 
    // or we might need to check status. Here we return the publish_id.

    return { id: publishId };
}
