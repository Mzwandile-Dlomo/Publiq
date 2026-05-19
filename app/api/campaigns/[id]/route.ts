import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PLATFORMS = ["youtube", "tiktok", "instagram", "facebook"] as const;

const updateCampaignSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    brief: z.string().max(10000).optional().nullable(),
    budget: z.number().positive().optional().nullable(),
    currency: z.string().length(3).optional(),
    niches: z.array(z.string()).max(10).optional(),
    platforms: z.array(z.enum(PLATFORMS)).max(4).optional(),
    deadline: z.string().datetime().optional().nullable(),
    status: z.enum(["draft", "open", "in_progress", "completed", "canceled"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/campaigns/[id] — get a single campaign with its collaborations.
 */
export async function GET(_req: Request, { params }: Params) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
            collaborations: {
                include: {
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                            username: true,
                            niches: true,
                        },
                    },
                },
            },
        },
    });

    if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Brand can see their own campaigns; creators can see open campaigns
    const userId = session.userId as string;
    if (campaign.brandId !== userId && campaign.status !== "open") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ campaign });
}

/**
 * PATCH /api/campaigns/[id] — update a campaign (brand owner only).
 */
export async function PATCH(req: Request, { params }: Params) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
        where: { id },
        select: { brandId: true },
    });

    if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.brandId !== (session.userId as string)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const data = updateCampaignSchema.parse(body);

        const updated = await prisma.campaign.update({
            where: { id },
            data: {
                ...data,
                deadline: data.deadline ? new Date(data.deadline) : data.deadline,
            },
        });

        return NextResponse.json({ campaign: updated });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("Campaign update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/campaigns/[id] — delete a campaign (brand owner only).
 */
export async function DELETE(_req: Request, { params }: Params) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
        where: { id },
        select: { brandId: true },
    });

    if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.brandId !== (session.userId as string)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.campaign.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
