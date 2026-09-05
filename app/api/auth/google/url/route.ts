import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google";
import { verifySession } from "@/lib/auth";
import { assertGoogleOAuthConfigValid } from "@/lib/config-validation";

export async function GET() {
    assertGoogleOAuthConfigValid();
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await getGoogleAuthUrl();
    return NextResponse.redirect(url);
}
