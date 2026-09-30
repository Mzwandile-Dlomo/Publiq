import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifySession: vi.fn(),
  findManyAccounts: vi.fn(),
  createContent: vi.fn(),
  createLogs: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ verifySession: mocks.verifySession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    socialAccount: { findMany: mocks.findManyAccounts },
    $transaction: mocks.transaction,
  },
}));

import { POST } from "@/app/api/content/route";

function request(scheduledAt: string) {
  return new Request("http://localhost/api/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Scheduled video",
      mediaUrl: "https://example.com/video.mp4",
      mediaType: "video",
      status: "scheduled",
      scheduledAt,
      platforms: ["youtube"],
    }),
  });
}

describe("content scheduling route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifySession.mockResolvedValue({ userId: "user-1" });
    mocks.findManyAccounts.mockResolvedValue([]);
    mocks.createContent.mockResolvedValue({ id: "content-1", publications: [] });
    mocks.createLogs.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation((callback) =>
      callback({
        content: { create: mocks.createContent },
        publicationLog: { createMany: mocks.createLogs },
      })
    );
  });

  it("atomically creates worker queue entries for scheduled platforms", async () => {
    const scheduledAt = new Date(Date.now() + 60_000).toISOString();
    const response = await POST(request(scheduledAt));

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.createLogs).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          contentId: "content-1",
          platform: "youtube",
          nextRetryAt: new Date(scheduledAt),
          idempotencyKey: "content-1#youtube#1",
        }),
      ],
    });
  });

  it("rejects a schedule in the past before writing", async () => {
    const response = await POST(request(new Date(Date.now() - 60_000).toISOString()));

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
