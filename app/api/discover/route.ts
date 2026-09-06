import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/discover?niche=gaming&q=search&page=1
 * Returns public creator profiles with optional niche/search filters.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const niche = searchParams.get("niche");
    const q = searchParams.get("q");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = 24;

    const creators = await prisma.user.findMany({
        where: {
            role: "creator",
            profilePublic: true,
            ...(niche ? { niches: { has: niche } } : {}),
            ...(q
                ? {
                      OR: [
                          { name: { contains: q, mode: "insensitive" } },
                          { username: { contains: q, mode: "insensitive" } },
                          { bio: { contains: q, mode: "insensitive" } },
                      ],
                  }
                : {}),
        },
        select: {
            id: true,
            name: true,
            image: true,
            username: true,
            bio: true,
            niches: true,
            socialAccounts: { select: { provider: true } },
            // Match the count shown on /profile/[username], which lists published content only.
            _count: { select: { content: { where: { status: "published" } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
    });

    return NextResponse.json({ creators });
}
