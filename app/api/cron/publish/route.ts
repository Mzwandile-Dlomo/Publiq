import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublisher } from "@/lib/platforms/registry";
import { platformConfigs, type Platform } from "@/lib/platforms";
import {
  claimPublication,
  markPublicationSuccess,
  markPublicationFailure,
  getPublicationStats,
  getPendingPublications,
} from "@/lib/publish-queue";
import { randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Validate Bearer token from Authorization header
 */
function validateCronToken(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7);
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const supplied = Buffer.from(token);
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(req: Request) {
  // Validate Bearer token authentication
  if (!validateCronToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobId = `cron-${randomUUID()}`;
    let claimed = 0;
    let published = 0;
    let failed = 0;
    let retry = 0;

    // Get all pending and retry publications ready for processing
    const pendingLogs = await getPendingPublications();

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
      const claimedLog = await claimPublication(log.contentId, log.platform, jobId);

      if (!claimedLog || claimedLog.id !== log.id) {
        // Another job already claimed this, skip it
        continue;
      }

      claimed++;

      try {
        const platform = log.platform as Platform;
        const config = platformConfigs[platform];

        // Check if platform is available
        if (!config?.available) {
          const marked = await markPublicationFailure(
            claimedLog.id,
            `${config?.name || platform} is not yet available`
          );
          if (marked.status === "retry") retry++;
          else failed++;
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
        await markPublicationSuccess(claimedLog.id, result.platformPostId);
        await prisma.$transaction([
          prisma.publication.updateMany({
            where: {
              contentId: log.contentId,
              platform: log.platform,
              socialAccountId: log.socialAccountId,
            },
            data: {
              status: "success",
              platformPostId: result.platformPostId,
              publishedAt: result.publishedAt,
              errorMessage: null,
            },
          }),
          prisma.content.update({
            where: { id: log.contentId },
            data: {
              status: "published",
              publishStatus: "published",
              publishedAt: result.publishedAt,
            },
          }),
        ]);
        published++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(
          `Cron: Failed to publish ${log.contentId} to ${log.platform}:`,
          error
        );

        const marked = await markPublicationFailure(claimedLog.id, message);

        await prisma.publication.updateMany({
          where: {
            contentId: log.contentId,
            platform: log.platform,
            socialAccountId: log.socialAccountId,
          },
          data: {
            status: marked.status === "failed" ? "failed" : "pending",
            errorMessage: message,
          },
        });

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
