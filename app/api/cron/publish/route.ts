import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublisher } from "@/lib/platforms/registry";
import { platformConfigs, type Platform } from "@/lib/platforms";
import {
  claimPublication,
  markPublicationSuccess,
  markPublicationFailure,
  getPublicationStats,
} from "@/lib/publish-queue";

/**
 * Validate Bearer token from Authorization header
 */
function validateCronToken(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix
  return token === process.env.CRON_SECRET;
}

export async function POST(req: Request) {
  // Validate Bearer token authentication
  if (!validateCronToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobId = `cron-${Date.now()}`;
    let claimed = 0;
    let published = 0;
    let failed = 0;
    let retry = 0;

    // Get all pending and retry publications ready for processing
    const pendingLogs = await prisma.publicationLog.findMany({
      where: {
        status: { in: ["pending", "retry"] },
        nextRetryAt: { lte: new Date() },
      },
      include: {
        content: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (pendingLogs.length === 0) {
      const stats = await getPublicationStats();
      return NextResponse.json({
        message: "No publications to process",
        stats,
        results: {
          claimed: 0,
          published: 0,
          failed: 0,
          retry: 0,
        },
      });
    }

    for (const log of pendingLogs) {
      // Atomically claim the publication (prevents duplicate publishing)
      const claimed_log = await claimPublication(log.contentId, log.platform, jobId);

      if (!claimed_log) {
        // Another job already claimed this, skip it
        continue;
      }

      claimed++;

      try {
        const platform = log.platform as Platform;
        const config = platformConfigs[platform];

        // Check if platform is available
        if (!config?.available) {
          await markPublicationFailure(
            log.id,
            `${config?.name || platform} is not yet available`
          );
          failed++;
          continue;
        }

        // Publish to the platform
        const publisher = await getPublisher(platform);
        const content = log.content;

        const result = await publisher.publish(content.userId, {
          id: content.id,
          mediaUrl: content.mediaUrl,
          mediaType: content.mediaType as "video" | "image",
          title: content.title,
          description: content.description,
          socialAccountId: log.socialAccountId,
        });

        // Mark as successfully published
        await markPublicationSuccess(log.id, result.platformPostId);
        published++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(
          `Cron: Failed to publish ${log.contentId} to ${log.platform}:`,
          error
        );

        const marked = await markPublicationFailure(log.id, message);

        // Track if it will be retried or permanently failed
        if (marked.status === "retry") {
          retry++;
        } else {
          failed++;
        }
      }
    }

    // Get updated stats
    const stats = await getPublicationStats();

    return NextResponse.json({
      message: "Cron job completed successfully",
      stats,
      results: {
        claimed,
        published,
        failed,
        retry,
      },
    });
  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
