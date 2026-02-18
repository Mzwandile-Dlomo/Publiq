import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export const googleConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirect: process.env.GOOGLE_REDIRECT_URI,
};

let cachedClient: OAuth2Client | null = null;
let cachedKey = "";

export function createOAuthClient(): OAuth2Client {
    const key = `${googleConfig.clientId}:${googleConfig.clientSecret}:${googleConfig.redirect}`;
    if (cachedClient && cachedKey === key) {
        return cachedClient;
    }
    cachedClient = new google.auth.OAuth2(
        googleConfig.clientId,
        googleConfig.clientSecret,
        googleConfig.redirect
    );
    cachedKey = key;
    return cachedClient;
}

export const SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
];

export function getGoogleAuthUrl() {
    const client = createOAuthClient();
    return client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: SCOPES,
    });
}

export async function getGoogleTokens(code: string) {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    return tokens;
}

export async function getGoogleUser(tokens: Parameters<OAuth2Client["setCredentials"]>[0]) {
    const client = createOAuthClient();
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();
    return data;
}
