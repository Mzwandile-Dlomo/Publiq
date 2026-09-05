import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateCollaborations } from "@/lib/collaborations";
import { z } from "zod";

const updateCollabSchema = z.object({
    status: z.enum([
        "invited",
        "applied",
        "accepted",
        "in_progress",
        "submitted",
        "approved",
        "paid",
        "rejected",
    ]),
    proposal: z.string().max(5000).optional(),
    contentId: z.string().optional().nullable(),
    feedback: z.string().max(2000).optional().nullable(),
    paymentRef: z.string().optional().nullable(),
});

/**
 * GET /api/collaborations — list collaborations for the authenticated user.
 * Creators see their own; brands see all collabs on their campaigns.
 */
export async function GET(req: Request) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId as string;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let collaborations;

    if (user.role === "brand") {
        // Return all collabs on campaigns owned by this brand
        collaborations = await prisma.collaboration.findMany({
            where: {
                campaign: { brandId: userId },
                ...(status ? { status } : {}),
            },
            include: {
                campaign: { select: { id: true, title: true, status: true } },
                creator: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        username: true,
                        niches: true,
                    },
                },
                content: { select: { id: true, title: true, thumbnailUrl: true } },
            },
            orderBy: { updatedAt: "desc" },
        });
    } else {
        // Creator sees their own collaborations
        collaborations = await prisma.collaboration.findMany({
            where: {
                creatorId: userId,
                ...(status ? { status } : {}),
            },
            include: {
                campaign: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        budget: true,
                        currency: true,
                        deadline: true,
                        status: true,
                        brand: { select: { id: true, name: true, image: true } },
                    },
                },
                content: { select: { id: true, title: true, thumbnailUrl: true } },
            },
            orderBy: { updatedAt: "desc" },
        });
    }

    return NextResponse.json({ collaborations });
}

/**
 * PATCH /api/collaborations/[id] — update collaboration status/proposal/content.
 * Both creator and brand can update within allowed transitions.
 */
export async function PATCH(req: Request) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop()!;

    const collab = await prisma.collaboration.findUnique({
        where: { id },
        include: { campaign: { select: { brandId: true } } },
    });

    if (!collab) {
        return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
    }

    const userId = session.userId as string;
    const isBrand = collab.campaign.brandId === userId;
    const isCreator = collab.creatorId === userId;

    if (!isBrand && !isCreator) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const data = updateCollabSchema.parse(body);

        // Validate allowed transitions per role
        const creatorTransitions: Record<string, string[]> = {
            invited: ["applied", "rejected"],
            accepted: ["in_progress"],
            in_progress: ["submitted"],
        };
        const brandTransitions: Record<string, string[]> = {
            applied: ["accepted", "rejected"],
            submitted: ["approved", "rejected"],
            approved: ["paid"],
        };

        const allowed = isBrand
            ? brandTransitions[collab.status] ?? []
            : creatorTransitions[collab.status] ?? [];

        if (!allowed.includes(data.status)) {
            return NextResponse.json(
                { error: `Invalid transition: ${collab.status} → ${data.status}` },
                { status: 409 }
            );
        }

        const updated = await prisma.collaboration.update({
            where: { id },
            data,
        });

        revalidateCollaborations(collab.creatorId);

        return NextResponse.json({ collaboration: updated });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("Collab update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
