import { getMetaAuthUrl } from "@/lib/meta";
import { NextResponse } from "next/server";
import { assertMetaOAuthConfigValid } from "@/lib/config-validation";

const INSTAGRAM_REDIRECT_URI =
    process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:3000/api/auth/instagram/callback";

export async function GET() {
    assertMetaOAuthConfigValid();
    const { url } = await getMetaAuthUrl(INSTAGRAM_REDIRECT_URI);
    return NextResponse.redirect(url);
}
