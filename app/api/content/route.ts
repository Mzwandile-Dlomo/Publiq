import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PLATFORMS } from "@/lib/platforms";

const contentSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    mediaUrl: z.string().url(),
    mediaType: z.enum(["video", "image"]).default("video"),
    thumbnailUrl: z.string().url().optional(),
    scheduledAt: z.string().optional(),
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
        const { title, description, mediaUrl, mediaType, thumbnailUrl, platforms, platformAccounts } = contentSchema.parse(body);

        const accountIds = Object.values(platformAccounts || {}).filter(Boolean);
        const accounts = accountIds.length > 0
            ? await prisma.socialAccount.findMany({
                where: {
                    userId: session.userId as string,
                    id: { in: accountIds },
                },
            })
            : [];
        const accountById = new Map(accounts.map((acc) => [acc.id, acc]));

        const defaultAccounts = await prisma.socialAccount.findMany({
            where: {
                userId: session.userId as string,
                provider: { in: platforms },
                isDefault: true,
            },
        });
        const defaultByProvider = new Map(defaultAccounts.map((acc) => [acc.provider, acc]));

        for (const [platform, accountId] of Object.entries(platformAccounts || {})) {
            if (!platforms.includes(platform as (typeof PLATFORMS)[number])) continue;
            const account = accountById.get(accountId);
            if (!account || account.provider !== platform) {
                return NextResponse.json({ error: "Invalid platform account selection" }, { status: 400 });
            }
        }

        const content = await prisma.content.create({
            data: {
                userId: session.userId as string,
                title,
                description,
                mediaUrl,
                mediaType,
                thumbnailUrl,
                status: body.status || "draft",
                scheduledAt: body.scheduledAt,
                publications: {
                    create: platforms.map((platform) => {
                        const selectedAccountId = platformAccounts?.[platform];
                        const resolvedAccountId = selectedAccountId
                            ? accountById.get(selectedAccountId)?.id
                            : defaultByProvider.get(platform)?.id;

                        return {
                            platform,
                            status: "pending",
                            socialAccountId: resolvedAccountId ?? null,
                        };
                    }),
                },
            },
            include: {
                publications: true,
            },
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
