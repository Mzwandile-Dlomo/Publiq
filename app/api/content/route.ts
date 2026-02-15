import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const contentSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    videoUrl: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    scheduledAt: z.string().optional(), // Date passed as ISO string
    status: z.enum(["draft", "scheduled"]).optional(),
});

export async function POST(req: Request) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, description, videoUrl, thumbnailUrl } = contentSchema.parse(body);

        const content = await prisma.content.create({
            data: {
                userId: session.userId as string,
                title,
                description,
                videoUrl,
                thumbnailUrl,
                status: body.status || "draft",
                scheduledAt: body.scheduledAt,
                publications: {
                    create: {
                        platform: "youtube",
                        status: "pending"
                    }
                }
            },
            include: {
                publications: true
            }
        });

        return NextResponse.json({ content });
    } catch (error) {
        console.error("Content Creation Error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
