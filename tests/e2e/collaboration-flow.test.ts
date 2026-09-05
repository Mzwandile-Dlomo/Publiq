import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type PrismaClientConstructor = typeof import(".prisma/client").PrismaClient;
const { PrismaClient } = (await import("@prisma/client")) as unknown as {
  PrismaClient: PrismaClientConstructor;
};

const auth = vi.hoisted(() => ({ verifySession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifySession: auth.verifySession }));

const databaseUrl = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
const runDatabaseE2E = process.env.RUN_DB_E2E === "true" && Boolean(databaseUrl);
const describeDatabaseE2E = runDatabaseE2E ? describe : describe.skip;

describeDatabaseE2E("brand and creator collaboration flow", () => {
  let pool: Pool;
  let prisma: InstanceType<PrismaClientConstructor>;
  let appPrisma: InstanceType<PrismaClientConstructor>;
  let brandId: string;
  let creatorId: string;

  beforeAll(async () => {
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
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.user.deleteMany({ where: { id: { in: [brandId, creatorId] } } });
    await appPrisma.$disconnect();
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
});
