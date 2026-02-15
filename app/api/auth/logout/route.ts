import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";

export async function POST(req: Request) {
    await deleteSession();
    return NextResponse.redirect(new URL("/auth/login", req.url));
}
