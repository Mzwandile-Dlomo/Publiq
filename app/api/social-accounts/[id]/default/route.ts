import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const account = await prisma.socialAccount.findFirst({
        where: { id, userId: session.userId as string },
        select: { id: true, provider: true },
    });

    if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.$transaction([
        prisma.socialAccount.updateMany({
            where: { userId: session.userId as string, provider: account.provider },
            data: { isDefault: false },
        }),
        prisma.socialAccount.update({
            where: { id: account.id },
            data: { isDefault: true },
        }),
    ]);

    return NextResponse.json({ success: true });
}
