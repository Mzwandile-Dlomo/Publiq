import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateUser } from "@/lib/auth-user";

export async function DELETE(
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
        select: { id: true, provider: true, isDefault: true },
    });

    if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.socialAccount.delete({ where: { id: account.id } });

    if (account.isDefault) {
        const nextAccount = await prisma.socialAccount.findFirst({
            where: { userId: session.userId as string, provider: account.provider },
            orderBy: { createdAt: "asc" },
        });
        if (nextAccount) {
            await prisma.socialAccount.update({
                where: { id: nextAccount.id },
                data: { isDefault: true },
            });
        }
    }

    revalidateUser(session.userId as string);

    return NextResponse.json({ success: true });
}
