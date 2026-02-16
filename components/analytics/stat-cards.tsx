"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, ThumbsUp, MessageSquare } from "lucide-react";

interface StatCardsProps {
    totals: { views: number; likes: number; comments: number };
    loading?: boolean;
}

export function StatCards({ totals, loading }: StatCardsProps) {
    const cards = [
        { label: "Total Views", value: totals.views, icon: Eye },
        { label: "Total Likes", value: totals.likes, icon: ThumbsUp },
        { label: "Total Comments", value: totals.comments, icon: MessageSquare },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
                <Card key={card.label}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {card.label}
                        </CardTitle>
                        <card.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                        ) : (
                            <div className="text-2xl font-bold">
                                {card.value.toLocaleString()}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
