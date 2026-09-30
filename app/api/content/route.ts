import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PLATFORMS } from "@/lib/platforms";
import { generateIdempotencyKey } from "@/lib/publish-queue";

const contentSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000).optional(),
    mediaUrl: z.string().url(),
    mediaType: z.enum(["video", "image"]).default("video"),
    thumbnailUrl: z.string().url().optional(),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    status: z.enum(["draft", "scheduled"]).optional(),
    platforms: z.array(z.enum(PLATFORMS)).min(1, "Select at least one platform"),
    platformAccounts: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: Request) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, description, mediaUrl, mediaType, thumbnailUrl, platforms, platformAccounts, status } = contentSchema.parse(body);
        const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

        if (status === "scheduled" && (!scheduledAt || scheduledAt <= new Date())) {
            return NextResponse.json(
                { error: "scheduledAt must be a future date when scheduling content" },
                { status: 400 }
            );
        }

        type SocialAccountRecord = { id: string; provider: string };

        const accountIds = Object.values(platformAccounts || {}).filter(Boolean);
        const accounts: SocialAccountRecord[] = accountIds.length > 0
            ? await prisma.socialAccount.findMany({
                where: {
                    userId: session.userId as string,
                    id: { in: accountIds },
                },
            })
            : [];
        const accountById = new Map(accounts.map((acc: SocialAccountRecord) => [acc.id, acc]));

        const defaultAccounts: SocialAccountRecord[] = await prisma.socialAccount.findMany({
            where: {
                userId: session.userId as string,
                provider: { in: platforms },
                isDefault: true,
            },
        });
        const defaultByProvider = new Map(defaultAccounts.map((acc: SocialAccountRecord) => [acc.provider, acc]));

        for (const [platform, accountId] of Object.entries(platformAccounts || {})) {
            if (!platforms.includes(platform as (typeof PLATFORMS)[number])) continue;
            const account = accountById.get(accountId);
            if (!account || account.provider !== platform) {
                return NextResponse.json({ error: "Invalid platform account selection" }, { status: 400 });
            }
        }

        const resolvedPublications = platforms.map((platform) => {
            const selectedAccountId = platformAccounts?.[platform];
            const socialAccountId = selectedAccountId
                ? accountById.get(selectedAccountId)?.id
                : defaultByProvider.get(platform)?.id;

            return { platform, socialAccountId: socialAccountId ?? null };
        });

        const content = await prisma.$transaction(async (tx) => {
            const created = await tx.content.create({
              data: {
                userId: session.userId as string,
                title,
                description,
                mediaUrl,
                mediaType,
                thumbnailUrl,
                status: status || "draft",
                publishStatus: status || "draft",
                scheduledAt,
                publications: {
                    create: resolvedPublications.map(({ platform, socialAccountId }) => ({
                        platform,
                        status: "pending",
                        socialAccountId,
                    })),
                },
              },
              include: { publications: true },
            });

            if (status === "scheduled" && scheduledAt) {
                await tx.publicationLog.createMany({
                    data: resolvedPublications.map(({ platform, socialAccountId }) => ({
                        contentId: created.id,
                        platform,
                        socialAccountId,
                        nextRetryAt: scheduledAt,
                        idempotencyKey: generateIdempotencyKey(created.id, platform, 1),
                    })),
                });
            }

            return created;
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
