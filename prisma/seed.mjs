import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed demo collaboration data.");
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const demoPassword = await bcrypt.hash("DemoPassword123!", 10);

try {
  const brand = await prisma.user.upsert({
    where: { email: "demo.brand@publiq.test" },
    update: {
      name: "Ubuntu Coffee Roasters",
      username: "ubuntu-coffee",
      role: "brand",
      bio: "Independent coffee roasters looking for authentic creator partnerships.",
      website: "https://example.com/ubuntu-coffee",
      password: demoPassword,
    },
    create: {
      email: "demo.brand@publiq.test",
      name: "Ubuntu Coffee Roasters",
      username: "ubuntu-coffee",
      role: "brand",
      bio: "Independent coffee roasters looking for authentic creator partnerships.",
      website: "https://example.com/ubuntu-coffee",
      password: demoPassword,
    },
  });

  const creator = await prisma.user.upsert({
    where: { email: "demo.creator@publiq.test" },
    update: {
      name: "Maya Dlamini",
      username: "maya-creates",
      role: "creator",
      bio: "Cape Town food, travel, and lifestyle creator.",
      niches: ["food", "travel", "lifestyle"],
      website: "https://example.com/maya-creates",
      profilePublic: true,
      password: demoPassword,
    },
    create: {
      email: "demo.creator@publiq.test",
      name: "Maya Dlamini",
      username: "maya-creates",
      role: "creator",
      bio: "Cape Town food, travel, and lifestyle creator.",
      niches: ["food", "travel", "lifestyle"],
      website: "https://example.com/maya-creates",
      profilePublic: true,
      password: demoPassword,
    },
  });

  const campaignData = {
    title: "Spring Cold Brew Launch",
    description: "Create a short-form video featuring our new cold brew range.",
    brief: "Show an authentic morning routine and tag @ubuntucoffee.",
    budget: 2500,
    currency: "ZAR",
    niches: ["food", "lifestyle"],
    platforms: ["instagram", "tiktok"],
    status: "open",
    deadline: new Date("2026-10-15T12:00:00.000Z"),
  };

  const existingCampaign = await prisma.campaign.findFirst({
    where: { brandId: brand.id, title: campaignData.title },
  });
  const campaign = existingCampaign
    ? await prisma.campaign.update({ where: { id: existingCampaign.id }, data: campaignData })
    : await prisma.campaign.create({ data: { ...campaignData, brandId: brand.id } });

  const collaboration = await prisma.collaboration.upsert({
    where: { campaignId_creatorId: { campaignId: campaign.id, creatorId: creator.id } },
    update: { status: "invited", fee: 2500, currency: "ZAR", proposal: null },
    create: {
      campaignId: campaign.id,
      creatorId: creator.id,
      status: "invited",
      fee: 2500,
      currency: "ZAR",
    },
  });

  console.log("Demo collaboration data is ready.");
  console.log("Brand: demo.brand@publiq.test");
  console.log("Creator: demo.creator@publiq.test");
  console.log("Password: DemoPassword123!");
  console.log(`Campaign: ${campaign.title} (${campaign.id})`);
  console.log(`Invitation: ${collaboration.id}`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
