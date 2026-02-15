import { PricingCards } from "@/components/pricing/pricing-cards";
import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PricingPage() {
    const session = await verifySession();

    // Optional: Redirect if already subscribed? 
    // For now, just show the cards.

    return (
        <div className="container mx-auto py-20">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
                <p className="text-xl text-muted-foreground">
                    Choose the plan that's right for you.
                </p>
            </div>
            <PricingCards />
        </div>
    );
}
