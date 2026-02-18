import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayfastConfig, validatePayfastItn } from "@/lib/payfast";
import { revalidateUser } from "@/lib/auth-user";

function mapStatus(paymentStatus: string) {
    switch (paymentStatus) {
        case "COMPLETE":
            return "active";
        case "FAILED":
            return "failed";
        case "CANCELLED":
            return "canceled";
        default:
            return "pending";
    }
}

export async function POST(req: Request) {
    const body = await req.text();
    const signature = new URLSearchParams(body).get("signature") || "";

    const config = getPayfastConfig();

    try {
        const validation = await validatePayfastItn(body, signature, config);
        if (!validation.ok) {
            console.error("PayFast ITN validation failed:", validation.reason);
            return NextResponse.json({ error: "Invalid ITN" }, { status: 400 });
        }

        const params = validation.params;
        const paymentStatus = params.payment_status || "";
        const userId = params.custom_str1;
        const plan = params.custom_str2 || "free";
        const paymentId = params.m_payment_id || params.pf_payment_id;

        const status = mapStatus(paymentStatus);

        if (userId) {
            await prisma.subscription.upsert({
                where: { userId },
                create: {
                    userId,
                    status,
                    plan,
                    payfastPaymentId: paymentId || null,
                },
                update: {
                    status,
                    plan,
                    payfastPaymentId: paymentId || undefined,
                },
            });
            revalidateUser(userId);
        } else if (paymentId) {
            await prisma.subscription.updateMany({
                where: { payfastPaymentId: paymentId },
                data: { status, plan },
            });
            const sub = await prisma.subscription.findFirst({
                where: { payfastPaymentId: paymentId },
                select: { userId: true },
            });
            if (sub?.userId) revalidateUser(sub.userId);
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("PayFast ITN Handler Error:", error);
        return NextResponse.json({ error: "Webhook Handler Error" }, { status: 500 });
    }
}
