import { getMetaAuthUrl } from "@/lib/meta";
import { NextResponse } from "next/server";
import { assertMetaOAuthConfigValid } from "@/lib/config-validation";

export async function GET() {
    assertMetaOAuthConfigValid();
    const { url } = await getMetaAuthUrl();
    return NextResponse.redirect(url);
}
