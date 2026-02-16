import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // @ts-expect-error - Stripe SDK type may not include this API version yet
    apiVersion: "2025-01-27.acacia",
    typescript: true,
});
