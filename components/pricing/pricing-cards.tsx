"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PricingPlan {
    name: string;
    description: string;
    price: string;
    priceId: string;
    features: string[];
}

// Replace with actual Stripe Price IDs
const PLANS: PricingPlan[] = [
    {
        name: "Pro",
        description: "For serious content creators.",
        price: "$19/month",
        priceId: "price_1Q...", // TODO: Replace with real ID
        features: [
            "Unlimited uploads",
            "Connect all platforms (YouTube, TikTok, etc.)",
            "Advanced Scheduling",
            "Priority Support",
        ],
    },
];

export function PricingCards() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    async function onSubscribe(priceId: string) {
        setIsLoading(true);
        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ priceId }),
            });

            if (!res.ok) {
                const json = await res.json();
                if (res.status === 401) {
                    router.push("/auth/login");
                    return;
                }
                throw new Error(json.error || "Failed to start checkout");
            }

            const { url } = await res.json();
            if (url) {
                window.location.href = url;
            } else {
                throw new Error("No checkout URL returned");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error subscribing");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex justify-center">
            {PLANS.map((plan) => (
                <Card key={plan.name} className="w-full max-w-2xl rounded-3xl border border-border bg-card shadow-md">
                    <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
                        <div className="space-y-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Creator Plan
                            </div>
                            <div>
                                <CardTitle className="text-3xl">{plan.name}</CardTitle>
                                <CardDescription className="mt-2 text-base">
                                    {plan.description}
                                </CardDescription>
                            </div>
                            <div className="text-4xl font-semibold">{plan.price}</div>
                            <Button
                                className="w-full rounded-full md:w-auto"
                                onClick={() => onSubscribe(plan.priceId)}
                                disabled={isLoading}
                            >
                                {isLoading ? "Loading..." : "Subscribe"}
                            </Button>
                        </div>
                        <div className="rounded-2xl border border-border bg-white p-5">
                            <div className="text-sm font-semibold">Everything in Pro</div>
                            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center">
                                        <Check className="mr-2 h-4 w-4 text-emerald-500" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
