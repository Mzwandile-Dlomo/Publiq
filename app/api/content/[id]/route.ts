import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromYouTube } from "@/lib/youtube";
import { z } from "zod";

const updateSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    scheduledAt: z.string().nullable().optional(),
    status: z.enum(["draft", "scheduled"]).optional(),
});

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await req.json();
        const data = updateSchema.parse(body);

        const existing = await prisma.content.findUnique({
            where: { id, userId: session.userId as string },
        });

        if (!existing) {
            return NextResponse.json({ error: "Content not found" }, { status: 404 });
        }

        const content = await prisma.content.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.scheduledAt !== undefined && {
                    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
                }),
                ...(data.status !== undefined && { status: data.status }),
            },
            include: { publications: true },
        });

        return NextResponse.json({ content });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

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
        include: { publications: true },
    });

    if (!content) {
        return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Delete from YouTube for any successful publications
    for (const pub of content.publications) {
        if (pub.platform === "youtube" && pub.platformPostId) {
            try {
                await deleteFromYouTube(session.userId as string, pub.platformPostId);
            } catch (error) {
                console.error(`Failed to delete YouTube video ${pub.platformPostId}:`, error);
            }
        }
    }

    await prisma.content.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
