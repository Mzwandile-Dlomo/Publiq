import { getMetaAuthUrl } from "@/lib/meta";
import { NextResponse } from "next/server";

const INSTAGRAM_REDIRECT_URI =
    process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:3000/api/auth/instagram/callback";

export async function GET() {
    const url = getMetaAuthUrl(INSTAGRAM_REDIRECT_URI);
    return NextResponse.redirect(url);
}
