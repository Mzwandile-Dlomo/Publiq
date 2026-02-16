import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
    console.warn("STRIPE_SECRET_KEY is not set — Stripe calls will fail at runtime.");
}

export const stripe = new Stripe(key || "sk_placeholder_not_set", {
    // @ts-expect-error - Stripe SDK type may not include this API version yet
    apiVersion: "2025-01-27.acacia",
    typescript: true,
});
