import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { priceId } = await req.json();
        if (!priceId) {
            return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId as string },
            include: { subscription: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Determine the customer ID
        // If user has a subscription record with stripeCustomerId, use it.
        let customerId = user.subscription?.stripeCustomerId;

        // If not, create a new customer in Stripe
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name || undefined,
                metadata: {
                    userId: user.id
                }
            });
            customerId = customer.id;

            // Save customer ID to DB (create subscription record if missing)
            await prisma.subscription.upsert({
                where: { userId: user.id },
                create: {
                    userId: user.id,
                    stripeCustomerId: customerId,
                    status: 'incomplete', // Will be updated by webhook
                },
                update: {
                    stripeCustomerId: customerId,
                }
            });
        }

        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing?canceled=true`,
            metadata: {
                userId: user.id,
            },
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error("Stripe Checkout Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
