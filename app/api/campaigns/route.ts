import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PLATFORMS = ["youtube", "tiktok", "instagram", "facebook"] as const;

const campaignSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    brief: z.string().max(10000).optional(),
    budget: z.number().positive().optional(),
    currency: z.string().length(3).default("ZAR"),
    niches: z.array(z.string()).max(10).default([]),
    platforms: z.array(z.enum(PLATFORMS)).max(4).default([]),
    deadline: z.string().datetime().optional(),
    status: z.enum(["draft", "open"]).default("draft"),
});

/**
 * GET /api/campaigns — list campaigns created by the authenticated brand.
 */
export async function GET(req: Request) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const campaigns = await prisma.campaign.findMany({
        where: {
            brandId: session.userId as string,
            ...(status ? { status } : {}),
        },
        include: {
            _count: { select: { collaborations: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ campaigns });
}

/**
 * POST /api/campaigns — create a new campaign (brands only).
 */
export async function POST(req: Request) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure the user is a brand account
    const user = await prisma.user.findUnique({
        where: { id: session.userId as string },
        select: { role: true },
    });

    if (!user || user.role !== "brand") {
        return NextResponse.json(
            { error: "Only brand accounts can create campaigns" },
            { status: 403 }
        );
    }

    try {
        const body = await req.json();
        const data = campaignSchema.parse(body);

        const campaign = await prisma.campaign.create({
            data: {
                ...data,
                brandId: session.userId as string,
                deadline: data.deadline ? new Date(data.deadline) : undefined,
            },
        });

        return NextResponse.json({ campaign }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("Campaign create error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
