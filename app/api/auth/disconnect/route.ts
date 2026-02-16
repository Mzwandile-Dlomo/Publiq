import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider } = await request.json();
    if (!provider || typeof provider !== "string") {
        return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    }

    const deleted = await prisma.socialAccount.deleteMany({
        where: {
            userId: session.userId as string,
            provider,
        },
    });

    if (deleted.count === 0) {
        return NextResponse.json({ error: "No connected account found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}
