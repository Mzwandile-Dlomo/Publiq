/**
 * Type definitions for PublicationLog
 * These are manually defined here because the Prisma schema drift
 * prevents automatic code generation from the database.
 * Keep these in sync with prisma/schema.prisma PublicationLog model.
 */

export type PublicationLogStatus = "pending" | "claimed" | "publishing" | "published" | "failed" | "retry";

export interface PublicationLog {
  id: string;
  contentId: string;
  platform: string;
  socialAccountId?: string | null;
  status: PublicationLogStatus;
  publishedUrl?: string | null;
  claimedAt?: Date | null;
  claimedBy?: string | null;
  attemptCount: number;
  idempotencyKey: string;
  lastError?: string | null;
  nextRetryAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
