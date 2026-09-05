import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateUser } from "@/lib/auth-user";
import { z } from "zod";

const NICHE_OPTIONS = [
    "lifestyle", "gaming", "fitness", "beauty", "food", "travel",
    "tech", "fashion", "finance", "education", "music", "comedy",
    "sports", "parenting", "business", "health", "art", "diy",
];

const updateProfileSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    username: z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-z0-9_-]+$/, "Only lowercase letters, numbers, hyphens and underscores")
        .optional(),
    bio: z.string().max(500).optional().nullable(),
    niches: z.array(z.string()).max(5).optional(),
    website: z.string().url().optional().nullable(),
    profilePublic: z.boolean().optional(),
    role: z.enum(["creator", "brand"]).optional(),
});

/**
 * GET /api/profile — returns the authenticated user's full profile.
 */
export async function GET() {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId as string },
        select: {
            id: true,
            email: true,
            name: true,
            image: true,
            username: true,
            bio: true,
            niches: true,
            website: true,
            profilePublic: true,
            role: true,
            createdAt: true,
        },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user, nicheOptions: NICHE_OPTIONS });
}

/**
 * PATCH /api/profile — updates the authenticated user's profile.
 */
export async function PATCH(req: Request) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const data = updateProfileSchema.parse(body);

        // Ensure username is not taken by another user
        if (data.username) {
            const existing = await prisma.user.findFirst({
                where: {
                    username: data.username,
                    id: { not: session.userId as string },
                },
            });
            if (existing) {
                return NextResponse.json(
                    { error: "Username is already taken" },
                    { status: 409 }
                );
            }
        }

        const updated = await prisma.user.update({
            where: { id: session.userId as string },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                username: true,
                bio: true,
                niches: true,
                website: true,
                profilePublic: true,
                role: true,
            },
        });

        revalidateUser(session.userId as string);
        return NextResponse.json({ user: updated });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("Profile update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
