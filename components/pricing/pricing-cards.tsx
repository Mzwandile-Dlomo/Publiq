"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
        } catch (error: any) {
            toast.error(error.message || "Error subscribing");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
                <Card key={plan.name} className="flex flex-col">
                    <CardHeader>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="text-3xl font-bold mb-4">{plan.price}</div>
                        <ul className="space-y-2">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex items-center text-sm">
                                    <Check className="mr-2 h-4 w-4 text-green-500" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full"
                            onClick={() => onSubscribe(plan.priceId)}
                            disabled={isLoading}
                        >
                            {isLoading ? "Loading..." : "Subscribe"}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
