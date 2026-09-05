import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { BrandDashboardClient } from "@/components/brand/brand-dashboard-client";

export const metadata = {
    title: "Brand Dashboard – Publiq",
};

export default async function BrandDashboardPage() {
    const user = await getAuthenticatedUser();

    if (user.role !== "brand") {
        redirect("/dashboard");
    }

    const campaigns = await prisma.campaign.findMany({
        where: { brandId: user.id },
        include: { _count: { select: { collaborations: true } } },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="mx-auto max-w-6xl px-6 py-16">
                <BrandDashboardClient initialCampaigns={campaigns as never} />
                <SiteFooter />
            </main>
        </div>
    );
}
