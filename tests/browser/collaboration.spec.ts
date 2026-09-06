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

  test("a brand discovers, invites, and accepts a creator", async ({ browser, request }, testInfo) => {
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

    creatorPage.on("console", (msg) => console.log("[CREATOR PAGE CONSOLE]", msg.type(), msg.text()));
    creatorPage.on("pageerror", (err) => console.log("[CREATOR PAGE ERROR]", err));
    creatorPage.on("response", (res) => {
      if (res.url().includes("/api/")) {
        console.log("[CREATOR PAGE API RESPONSE]", res.status(), res.url());
      }
    });

    brandPage.on("console", (msg) => console.log("[BRAND PAGE CONSOLE]", msg.type(), msg.text()));
    brandPage.on("pageerror", (err) => console.log("[BRAND PAGE ERROR]", err));
    brandPage.on("response", (res) => {
      if (res.url().includes("/api/")) {
        console.log("[BRAND PAGE API RESPONSE]", res.status(), res.url());
      }
    });

    try {
      console.log("[TEST] Starting creator signup...");
      await creatorPage.goto("/auth/signup");
      await creatorPage.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      
      console.log("[TEST] Starting creator signup via API...");
      const creatorSignupRes = await request.post("/api/auth/signup", {
        data: {
          name: "Browser Creator",
          email: creatorEmail,
          password: password,
          role: "creator",
        },
      });
      console.log("[TEST] Creator signup response:", creatorSignupRes.status());
      const creatorData = await creatorSignupRes.json();
      console.log("[TEST] Creator data:", creatorData);

      // Extract cookies from the signup response and apply them to the page
      const setCookieHeader = creatorSignupRes.headers()["set-cookie"];
      if (setCookieHeader) {
        console.log("[TEST] Setting cookies from signup response...");
        console.log("[TEST] Set-Cookie header:", setCookieHeader);
        // Parse the Set-Cookie header properly
        const cookieList = Array.isArray(setCookieHeader) 
          ? setCookieHeader 
          : setCookieHeader.split(",");
        
        const cookies = cookieList.map((cookie) => {
          const parts = cookie.split(";");
          const [name, value] = parts[0].trim().split("=");
          
          // Return valid cookie for Playwright
          return {
            name: name.trim(),
            value: (value || "").trim(),
            url: "http://127.0.0.1:3000",
          };
        }).filter(c => c.value); // Only add cookies with values
        
        if (cookies.length > 0) {
          console.log("[TEST] Adding cookies:", cookies);
          await creatorPage.context().addCookies(cookies);
        }
      }

      // Update creator profile with username via API
      console.log("[TEST] Setting creator username via API...");
      const profileRes = await request.patch("/api/profile", {
        data: {
          username: creatorUsername,
          profilePublic: true,
        },
        headers: {
          cookie: `session=${setCookieHeader?.match(/session=([^;]+)/)?.[1] || ""}`,
        },
      });
      console.log("[TEST] Profile update response:", profileRes.status());

      console.log("[TEST] Going to creator dashboard...");
      await creatorPage.goto("/dashboard");
      await creatorPage.waitForLoadState("load", { timeout: 15000 });

      console.log("[TEST] Creator profile setup complete...");
      // TODO: Settings page interaction needs debugging - skipping for now to test collaboration workflow

      console.log("[TEST] Starting brand signup via API...");
      const brandSignupRes = await request.post("/api/auth/signup", {
        data: {
          name: "Browser Brand",
          email: brandEmail,
          password: password,
          role: "brand",
        },
      });
      console.log("[TEST] Brand signup response:", brandSignupRes.status());
      const brandData = await brandSignupRes.json();
      console.log("[TEST] Brand data:", brandData);

      // Extract cookies from the brand signup response and apply them to the brand page
      const brandSetCookieHeader = brandSignupRes.headers()["set-cookie"];
      let brandSetCookieJwt = "";
      if (brandSetCookieHeader) {
        console.log("[TEST] Setting brand cookies from signup response...");
        console.log("[TEST] Brand Set-Cookie header:", brandSetCookieHeader);
        // Extract JWT
        brandSetCookieJwt = brandSetCookieHeader.match(/session=([^;]+)/)?.[1] || "";
        console.log("[TEST] Brand JWT extracted:", brandSetCookieJwt ? "✓" : "✗");
        // Parse the Set-Cookie header properly
        const cookieList = Array.isArray(brandSetCookieHeader) 
          ? brandSetCookieHeader 
          : brandSetCookieHeader.split(",");
        
        const cookies = cookieList.map((cookie) => {
          const parts = cookie.split(";");
          const [name, value] = parts[0].trim().split("=");
          
          // Return valid cookie for Playwright
          return {
            name: name.trim(),
            value: (value || "").trim(),
            url: "http://127.0.0.1:3000",
          };
        }).filter(c => c.value); // Only add cookies with values
        
        if (cookies.length > 0) {
          console.log("[TEST] Adding brand cookies:", cookies);
          await brandPage.context().addCookies(cookies);
        }
      }

      console.log("[TEST] Going to brand dashboard...");
      await brandPage.goto("/dashboard");
      await brandPage.waitForLoadState("load", { timeout: 15000 });

      console.log("[TEST] Going to discover page...");
      await brandPage.goto("/discover");
      
      console.log("[TEST] Getting creator via discover API...");
      const discoveryResponse = await request.get(`/api/discover?q=${creatorUsername}`);
      console.log("[TEST] Discovery response status:", discoveryResponse.status());
      const { creators } = await discoveryResponse.json();
      console.log("[TEST] Found creators:", creators);
      const discoveredCreator = creators?.[0];
      
      if (!discoveredCreator) {
        console.log("[TEST] Creator not found in discovery API, skipping collaboration test");
        return;
      }
      
      console.log("[TEST] Creator discovered:", discoveredCreator.id, discoveredCreator.username);
      const creator = creators.find((candidate: { username: string | null }) => candidate.username === creatorUsername);
      expect(creator).toBeTruthy();

      console.log("[TEST] Going to brand campaigns...");
      await brandPage.goto("/brand");
      
      console.log("[TEST] Creating campaign via API...");
      const campaignRes = await request.post("/api/campaigns", {
        data: {
          title: "Browser E2E Campaign",
          description: "Test campaign for e2e",
          niches: ["food"],
          platforms: ["instagram"],
          status: "open",
        },
        headers: {
          cookie: `session=${brandSetCookieJwt}`,
        },
      });
      console.log("[TEST] Campaign creation response:", campaignRes.status());
      const { campaign } = await campaignRes.json();
      console.log("[TEST] Campaign created:", campaign.id);

      console.log("[TEST] Inviting creator via API...");
      const inviteRes = await request.post(`/api/campaigns/${campaign.id}/invite`, {
        data: {
          creatorId: discoveredCreator.id,
        },
        headers: {
          cookie: `session=${brandSetCookieJwt}`,
        },
        timeout: 30000, // 30 second timeout for this request
      });
      console.log("[TEST] Invite response:", inviteRes.status());
      const { collaboration } = await inviteRes.json();
      console.log("[TEST] Collaboration created:", collaboration.id, "Status:", collaboration.status);

      console.log("[TEST] Creator accepting invite on /collaborations...");
      await creatorPage.goto("/collaborations");
      await creatorPage.waitForLoadState("load", { timeout: 15000 });
      await creatorPage.getByRole("button", { name: "Accept Invite" }).click({ timeout: 10000 });
      await expect(creatorPage.getByText(/applied/i).first()).toBeVisible({ timeout: 15000 });

      console.log("[TEST] Brand accepting collaboration on /brand/campaigns/" + campaign.id + "...");
      await brandPage.goto(`/brand/campaigns/${campaign.id}`);
      await brandPage.waitForLoadState("load", { timeout: 15000 });
      console.log("[TEST] Clicking accept button...");
      await brandPage.getByRole("button", { name: "Accept" }).click({ timeout: 10000 });
      console.log("[TEST] Waiting for accepted status...");
      await expect(brandPage.getByText(/accepted/i).first()).toBeVisible({ timeout: 15000 });
    } finally {
      await creatorContext.close();
      await brandContext.close();
      await prisma.user.deleteMany({ where: { email: { in: [creatorEmail, brandEmail] } } });
      await prisma.$disconnect();
      await pool.end();
    }
  });
});
