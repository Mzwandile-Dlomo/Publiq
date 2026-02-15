import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const content = await prisma.content.findUnique({
        where: { id, userId: session.userId as string },
    });

    if (!content) {
        return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    await prisma.content.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
