import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: any) {
        console.error("Webhook signature verification failed.", error.message);
        return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    try {
        switch (event.type) {
            case "checkout.session.completed":
                // Retrieve the subscription details from Stripe.
                const subscription = await stripe.subscriptions.retrieve(
                    session.subscription as string
                );

                // Update the user's subscription in the database.
                // We stored userId in metadata during checkout creation.
                // Or we can start by looking up by stripeCustomerId
                // But metadata is safer if passed.

                const userId = session.metadata?.userId;

                if (userId) {
                    await prisma.subscription.upsert({
                        where: { userId: userId },
                        create: {
                            userId: userId,
                            stripeSubscriptionId: subscription.id,
                            stripeCustomerId: subscription.customer as string,
                            status: subscription.status,
                            plan: "pro", // TODO: Determine plan from priceId if multiple
                        },
                        update: {
                            stripeSubscriptionId: subscription.id,
                            stripeCustomerId: subscription.customer as string,
                            status: subscription.status,
                            plan: "pro",
                        }
                    });
                }
                break;

            case "invoice.payment_succeeded":
                // Continue to provision the subscription as payments continue to be made.
                // Store the status in your database and check when a user accesses your service.
                // This approach helps you avoid hitting Stripe limits.
                const invoice = event.data.object as any;
                const subscriptionId = invoice.subscription as string;

                // Find subscription by stripeSubscriptionId
                // Update status to 'active'
                await prisma.subscription.updateMany({
                    where: { stripeSubscriptionId: subscriptionId },
                    data: { status: "active" }
                });

                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error: any) {
        console.error("Stripe Webhook Handler Error:", error);
        return NextResponse.json({ error: "Webhook Handler Error" }, { status: 500 });
    }

    return NextResponse.json({ result: event, ok: true });
}
