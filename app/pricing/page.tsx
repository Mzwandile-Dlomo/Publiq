import { PricingCards } from "@/components/pricing/pricing-cards";

export default async function PricingPage() {
    return (
        <div className="bg-aurora bg-noise min-h-screen">
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="text-center">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Pricing
                    </div>
                    <h1 className="font-display mt-3 text-4xl">Simple plans that scale with you.</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Launch for free and upgrade when your publishing cadence grows.
                    </p>
                </div>
                <div className="mt-12">
                    <PricingCards />
                </div>
            </div>
        </div>
    );
}
