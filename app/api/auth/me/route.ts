import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId as string },
        select: {
            id: true,
            email: true,
            name: true,
            image: true,
            socialAccounts: {
                select: { id: true, provider: true, email: true, firstName: true, lastName: true },
            },
        },
    });

    return NextResponse.json({ user });
}
