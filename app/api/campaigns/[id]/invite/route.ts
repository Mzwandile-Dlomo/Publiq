import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateCollaborations } from "@/lib/collaborations";
import { z } from "zod";

const inviteSchema = z.object({
    creatorId: z.string().min(1),
    fee: z.number().positive().optional(),
    currency: z.string().length(3).default("ZAR"),
});

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/campaigns/[id]/invite
 * Brand invites a creator to a campaign.
 */
export async function POST(req: Request, { params }: Params) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: campaignId } = await params;

    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { brandId: true, status: true },
    });

    if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.brandId !== (session.userId as string)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (campaign.status !== "open" && campaign.status !== "in_progress") {
        return NextResponse.json(
            { error: "Campaign is not accepting invites" },
            { status: 409 }
        );
    }

    try {
        const body = await req.json();
        const { creatorId, fee, currency } = inviteSchema.parse(body);

        // Verify the creator exists and is a creator account
        const creator = await prisma.user.findUnique({
            where: { id: creatorId },
            select: { role: true },
        });

        if (!creator || creator.role !== "creator") {
            return NextResponse.json({ error: "Creator not found" }, { status: 404 });
        }

        const collab = await prisma.collaboration.upsert({
            where: { campaignId_creatorId: { campaignId, creatorId } },
            create: {
                campaignId,
                creatorId,
                fee,
                currency,
                status: "invited",
            },
            update: {
                status: "invited",
                fee,
                currency,
            },
        });

        revalidateCollaborations(creatorId);

        return NextResponse.json({ collaboration: collab }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("Invite error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
