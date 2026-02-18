import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    buildSignature,
    getPayfastConfig,
    getPayfastProcessUrl,
    toQueryString,
} from "@/lib/payfast";

const PLANS: Record<
    string,
    { amount: number; itemName: string; itemDescription: string }
> = {
    pro: {
        amount: 19,
        itemName: "Publiq Pro",
        itemDescription: "Pro subscription",
    },
};

function formatAmount(amount: number) {
    return amount.toFixed(2);
}

export async function POST(req: Request) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { plan } = await req.json();
        const planConfig = PLANS[plan as keyof typeof PLANS];
        if (!planConfig) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId as string },
            include: { subscription: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const config = getPayfastConfig();
        if (!config.merchantId || !config.merchantKey) {
            return NextResponse.json(
                { error: "PayFast is not configured" },
                { status: 500 }
            );
        }

        const paymentRef = `pf_${user.id}_${Date.now()}`;
        const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const params: Record<string, string> = {
            merchant_id: config.merchantId,
            merchant_key: config.merchantKey,
            return_url: `${baseUrl}/dashboard?success=true`,
            cancel_url: `${baseUrl}/pricing?canceled=true`,
            notify_url: `${baseUrl}/api/payfast/itn`,
            name_first: user.name?.split(" ")[0] || "Customer",
            name_last: user.name?.split(" ").slice(1).join(" ") || "",
            email_address: user.email || "",
            m_payment_id: paymentRef,
            amount: formatAmount(planConfig.amount),
            item_name: planConfig.itemName,
            item_description: planConfig.itemDescription,
            custom_str1: user.id,
            custom_str2: plan,
        };

        const signature = buildSignature(params, config.passphrase);
        const query = toQueryString({ ...params, signature });
        const url = `${getPayfastProcessUrl(config.sandbox)}?${query}`;

        await prisma.subscription.upsert({
            where: { userId: user.id },
            create: {
                userId: user.id,
                status: "pending",
                plan,
                payfastPaymentId: paymentRef,
            },
            update: {
                status: "pending",
                plan,
                payfastPaymentId: paymentRef,
            },
        });

        return NextResponse.json({ url });
    } catch (error) {
        console.error("PayFast Checkout Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
