import { getTikTokAuthUrl } from "@/lib/tiktok";
import { NextResponse } from "next/server";
import { assertTikTokOAuthConfigValid } from "@/lib/config-validation";

export async function GET() {
    assertTikTokOAuthConfigValid();
    const { url } = await getTikTokAuthUrl();
    return NextResponse.redirect(url);
}
