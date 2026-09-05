import { test, expect } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import prismaClientPackage from "@prisma/client";
import { Pool } from "pg";

type PrismaClientConstructor = typeof import(".prisma/client").PrismaClient;
const { PrismaClient } = prismaClientPackage as unknown as {
  PrismaClient: PrismaClientConstructor;
};

const databaseUrl = process.env.E2E_DATABASE_URL;
const runBrowserE2E = Boolean(databaseUrl);

test.describe("brand and creator collaboration", () => {
  test.skip(!runBrowserE2E, "E2E_DATABASE_URL is required for browser tests");

  test("a brand discovers, invites, and accepts a creator", async ({ browser, request }) => {
    const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const creatorEmail = `browser-creator-${suffix}@publiq.test`;
    const brandEmail = `browser-brand-${suffix}@publiq.test`;
    const creatorUsername = `creator-${suffix}`.slice(0, 30);
    const password = "BrowserE2E123!";
    const pool = new Pool({ connectionString: databaseUrl });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    const creatorContext = await browser.newContext();
    const brandContext = await browser.newContext();
    const creatorPage = await creatorContext.newPage();
    const brandPage = await brandContext.newPage();

    try {
      await creatorPage.goto("/auth/signup");
      await creatorPage.getByLabel("Name").fill("Browser Creator");
      await creatorPage.getByLabel("Email").fill(creatorEmail);
      await creatorPage.getByLabel("Password").fill(password);
      await creatorPage.getByRole("button", { name: "Sign Up" }).click();
      await creatorPage.waitForURL("**/dashboard");

      await creatorPage.goto("/settings");
      await creatorPage.getByPlaceholder("yourhandle").fill(creatorUsername);
      await creatorPage.getByRole("switch", { name: "Toggle public profile" }).click();
      await expect(creatorPage.getByText("Public", { exact: true })).toBeVisible();
      await creatorPage.getByRole("button", { name: "Save Profile" }).click();
      await expect(creatorPage.getByText("Saved")).toBeVisible();

      await brandPage.goto("/auth/signup?role=brand");
      await brandPage.getByLabel("Name").fill("Browser Brand");
      await brandPage.getByLabel("Email").fill(brandEmail);
      await brandPage.getByLabel("Password").fill(password);
      await brandPage.getByRole("button", { name: "Sign Up" }).click();
      await brandPage.waitForURL("**/dashboard");

      await brandPage.goto("/discover");
      await expect(brandPage.getByText(`@${creatorUsername}`)).toBeVisible();
      const discoveryResponse = await request.get(`/api/discover?q=${creatorUsername}`);
      const { creators } = await discoveryResponse.json();
      const creator = creators.find((candidate: { username: string | null }) => candidate.username === creatorUsername);
      expect(creator).toBeTruthy();

      await brandPage.goto("/brand");
      await brandPage.getByRole("button", { name: /Create Campaign|New Campaign/ }).click();
      await brandPage.getByPlaceholder("e.g. Summer Fitness Campaign").fill("Browser E2E Campaign");
      await brandPage.getByRole("button", { name: "food", exact: true }).click();
      await brandPage.getByRole("button", { name: "instagram", exact: true }).click();
      await brandPage.getByRole("button", { name: "open", exact: true }).click();
      await brandPage.getByRole("button", { name: "Create Campaign" }).click();
      await brandPage.getByRole("link", { name: /Browser E2E Campaign/ }).click();

      await brandPage.getByRole("button", { name: "Invite Creator" }).click();
      await brandPage.getByPlaceholder("cuid...").fill(creator.id);
      await brandPage.getByRole("button", { name: "Send Invite" }).click();
      await expect(brandPage.getByText("Browser Creator")).toBeVisible();

      await creatorPage.goto("/collaborations");
      await expect(creatorPage.getByText("Browser E2E Campaign")).toBeVisible();
      await creatorPage.getByRole("button", { name: "Accept Invite" }).click();
      await expect(creatorPage.getByText("applied", { exact: true })).toBeVisible();

      await brandPage.reload();
      await brandPage.getByRole("button", { name: "Accept" }).click();
      await expect(brandPage.getByText("accepted", { exact: true })).toBeVisible();
    } finally {
      await creatorContext.close();
      await brandContext.close();
      await prisma.user.deleteMany({ where: { email: { in: [creatorEmail, brandEmail] } } });
      await prisma.$disconnect();
      await pool.end();
    }
  });
});
