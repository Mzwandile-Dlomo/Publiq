import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type PrismaClientConstructor = typeof import(".prisma/client").PrismaClient;

const auth = vi.hoisted(() => ({ verifySession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifySession: auth.verifySession }));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
  revalidateTag: vi.fn(),
}));

const databaseUrl = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
const runDatabaseE2E = process.env.RUN_DB_E2E === "true" && Boolean(databaseUrl);
const describeDatabaseE2E = runDatabaseE2E ? describe : describe.skip;

describeDatabaseE2E("brand and creator collaboration flow", () => {
  let pool: Pool;
  let prisma: InstanceType<PrismaClientConstructor>;
  let appPrisma: InstanceType<PrismaClientConstructor>;
  let brandId: string;
  let creatorId: string;
  let privateCreatorId: string;
  let outsiderId: string;

  beforeAll(async () => {
    // Imported lazily so this file can still be collected when the Prisma client
    // has not been generated (the skipped unit-test run does not generate one).
    const { PrismaClient } = (await import("@prisma/client")) as unknown as {
      PrismaClient: PrismaClientConstructor;
    };

    pool = new Pool({ connectionString: databaseUrl });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    process.env.DATABASE_URL = databaseUrl;
    ({ prisma: appPrisma } = await import("@/lib/prisma"));

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const brand = await prisma.user.create({
      data: { email: `e2e-brand-${suffix}@publiq.test`, name: "E2E Brand", role: "brand" },
    });
    const creator = await prisma.user.create({
      data: {
        email: `e2e-creator-${suffix}@publiq.test`,
        name: "E2E Creator",
        username: `e2e-creator-${suffix}`.slice(0, 30),
        role: "creator",
        niches: ["food"],
        profilePublic: true,
      },
    });

    brandId = brand.id;
    creatorId = creator.id;
    const privateCreator = await prisma.user.create({
      data: {
        email: `e2e-private-${suffix}@publiq.test`,
        name: "Private Creator",
        username: `e2e-private-${suffix}`.slice(0, 30),
        role: "creator",
        profilePublic: false,
      },
    });
    const outsider = await prisma.user.create({
      data: { email: `e2e-outsider-${suffix}@publiq.test`, name: "Outsider", role: "brand" },
    });
    privateCreatorId = privateCreator.id;
    outsiderId = outsider.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    const userIds = [brandId, creatorId, privateCreatorId, outsiderId].filter(
      (id): id is string => typeof id === "string"
    );
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (appPrisma) await appPrisma.$disconnect();
    await prisma.$disconnect();
    await pool.end();
  });

  it("lets a brand invite a public creator, then lets the creator accept", async () => {
    const { POST: createCampaign } = await import("@/app/api/campaigns/route");
    const { POST: inviteCreator } = await import("@/app/api/campaigns/[id]/invite/route");
    const { PATCH: updateCollaboration } = await import("@/app/api/collaborations/[id]/route");

    const discoverableCreator = await prisma.user.findFirst({
      where: { id: creatorId, role: "creator", profilePublic: true },
    });
    expect(discoverableCreator?.id).toBe(creatorId);

    auth.verifySession.mockResolvedValue({ userId: brandId });
    const campaignResponse = await createCampaign(
      new Request("http://localhost/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "E2E Collaboration Campaign",
          budget: 2500,
          currency: "ZAR",
          niches: ["food"],
          platforms: ["instagram"],
          status: "open",
        }),
      })
    );
    expect(campaignResponse.status).toBe(201);
    const { campaign } = await campaignResponse.json();

    auth.verifySession.mockResolvedValue({ userId: outsiderId });
    const forbiddenInvite = await inviteCreator(
      new Request(`http://localhost/api/campaigns/${campaign.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, fee: 2500, currency: "ZAR" }),
      }),
      { params: Promise.resolve({ id: campaign.id }) }
    );
    expect(forbiddenInvite.status).toBe(403);

    auth.verifySession.mockResolvedValue({ userId: brandId });
    const invitationResponse = await inviteCreator(
      new Request(`http://localhost/api/campaigns/${campaign.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, fee: 2500, currency: "ZAR" }),
      }),
      { params: Promise.resolve({ id: campaign.id }) }
    );
    expect(invitationResponse.status).toBe(201);
    const { collaboration: invitation } = await invitationResponse.json();
    expect(invitation.status).toBe("invited");

    auth.verifySession.mockResolvedValue({ userId: creatorId });
    const invalidTransition = await updateCollaboration(
      new Request(`http://localhost/api/collaborations/${invitation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      }),
      { params: Promise.resolve({ id: invitation.id }) }
    );
    expect(invalidTransition.status).toBe(409);

    const proposal = "I would love to create a coffee morning-routine reel for this launch.";
    const applyResponse = await updateCollaboration(
      new Request(`http://localhost/api/collaborations/${invitation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "applied", proposal }),
      }),
      { params: Promise.resolve({ id: invitation.id }) }
    );
    expect(applyResponse.status).toBe(200);
    expect(await applyResponse.json()).toMatchObject({
      collaboration: { id: invitation.id, status: "applied", proposal },
    });

    auth.verifySession.mockResolvedValue({ userId: brandId });
    const acceptResponse = await updateCollaboration(
      new Request(`http://localhost/api/collaborations/${invitation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      }),
      { params: Promise.resolve({ id: invitation.id }) }
    );
    expect(acceptResponse.status).toBe(200);
    expect(await acceptResponse.json()).toMatchObject({
      collaboration: { id: invitation.id, status: "accepted" },
    });

    const creatorCollaborations = await prisma.collaboration.findMany({
      where: { creatorId },
      include: { campaign: { select: { brandId: true, title: true } } },
    });
    expect(creatorCollaborations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: invitation.id,
          status: "accepted",
          campaign: expect.objectContaining({ brandId, title: campaign.title }),
        }),
      ])
    );
  });

  it("only exposes public creators through discovery and public profile endpoints", async () => {
    const { GET: discover } = await import("@/app/api/discover/route");
    const { GET: getPublicProfile } = await import("@/app/api/profile/[username]/route");

    const discoverResponse = await discover(new Request("http://localhost/api/discover?q=E2E"));
    expect(discoverResponse.status).toBe(200);
    const { creators } = await discoverResponse.json();
    expect(creators.map((creator: { id: string }) => creator.id)).toContain(creatorId);
    expect(creators.map((creator: { id: string }) => creator.id)).not.toContain(privateCreatorId);

    const publicProfile = await getPublicProfile(new Request("http://localhost/api/profile/e2e"), {
      params: Promise.resolve({ username: (await prisma.user.findUniqueOrThrow({ where: { id: creatorId } })).username! }),
    });
    expect(publicProfile.status).toBe(200);

    const privateProfile = await getPublicProfile(new Request("http://localhost/api/profile/private"), {
      params: Promise.resolve({ username: (await prisma.user.findUniqueOrThrow({ where: { id: privateCreatorId } })).username! }),
    });
    expect(privateProfile.status).toBe(404);
  });

  it("rejects unauthenticated and creator-owned campaign creation", async () => {
    const { POST: createCampaign } = await import("@/app/api/campaigns/route");
    const request = () => new Request("http://localhost/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Unauthorized campaign" }),
    });

    auth.verifySession.mockResolvedValue(null);
    expect((await createCampaign(request())).status).toBe(401);

    auth.verifySession.mockResolvedValue({ userId: creatorId });
    expect((await createCampaign(request())).status).toBe(403);
  });
});
