import { getMetaAuthUrl } from "@/lib/meta";
import { NextResponse } from "next/server";

export async function GET() {
    const url = getMetaAuthUrl();
    return NextResponse.redirect(url);
}
