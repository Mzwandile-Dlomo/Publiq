import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google";
import { verifySession } from "@/lib/auth";

export async function GET() {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = getGoogleAuthUrl();
    return NextResponse.redirect(url);
}
