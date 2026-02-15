import { getTikTokAuthUrl } from "@/lib/tiktok";
import { NextResponse } from "next/server";

export async function GET() {
    const url = getTikTokAuthUrl();
    return NextResponse.redirect(url);
}
