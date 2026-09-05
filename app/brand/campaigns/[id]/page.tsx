import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { CampaignDetailClient } from "@/components/brand/campaign-detail-client";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: Props) {
    const user = await getAuthenticatedUser();

    if (user.role !== "brand") {
        redirect("/dashboard");
    }

    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
        where: { id, brandId: user.id },
        include: {
            collaborations: {
                include: {
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                            username: true,
                            niches: true,
                        },
                    },
                },
                orderBy: { updatedAt: "desc" },
            },
        },
    });

    if (!campaign) {
        notFound();
    }

    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="mx-auto max-w-4xl px-6 py-16">
                <CampaignDetailClient campaign={campaign as never} />
                <SiteFooter />
            </main>
        </div>
    );
}
