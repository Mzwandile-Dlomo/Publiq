import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { z } from "zod";

const PLATFORMS = ["youtube", "tiktok", "instagram", "facebook"] as const;

const suggestSchema = z.object({
    title: z.string().min(1).max(300),
    description: z.string().max(5000).optional(),
    platform: z.enum(PLATFORMS),
});

/**
 * POST /api/ai/suggest
 * Returns optimised title, description, hashtags and best posting times for the given content.
 */
export async function POST(req: Request) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    try {
        const body = await req.json();
        const { title, description, platform } = suggestSchema.parse(body);

        // If no API key, return rule-based suggestions
        if (!apiKey) {
            return NextResponse.json({
                suggestions: getRuleBasedSuggestions(title, description ?? "", platform),
                source: "rule-based",
            });
        }

        const prompt = buildSuggestPrompt(title, description ?? "", platform);

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a social media content strategist. Respond ONLY with valid JSON matching the schema provided.",
                    },
                    { role: "user", content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 800,
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("OpenAI error:", err);
            return NextResponse.json({
                suggestions: getRuleBasedSuggestions(title, description ?? "", platform),
                source: "rule-based",
            });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const parsed = JSON.parse(content);

        return NextResponse.json({ suggestions: parsed, source: "ai" });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("AI suggest error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

function buildSuggestPrompt(title: string, description: string, platform: string): string {
    return `Optimise this content for ${platform}.

Current title: "${title}"
Current description: "${description || "(none)"}"

Return JSON with this exact shape:
{
  "optimisedTitle": "...",
  "optimisedDescription": "...",
  "hashtags": ["tag1", "tag2"],
  "bestPostingTimes": [
    { "day": "Monday", "time": "18:00", "reason": "..." }
  ],
  "tips": ["tip1", "tip2"]
}

Rules:
- Optimised title: engaging, clear, platform-appropriate length (YouTube <70 chars, TikTok/IG <150 chars)
- Description: include relevant keywords, CTAs, platform-specific formatting
- Hashtags: 5-15 relevant tags without #
- Best posting times: top 3 times with short reasons
- Tips: 2-3 actionable improvement suggestions`;
}

const PLATFORM_POSTING_TIMES: Record<string, { day: string; time: string; reason: string }[]> = {
    youtube: [
        { day: "Thursday", time: "17:00", reason: "Pre-weekend peak viewership" },
        { day: "Saturday", time: "11:00", reason: "Weekend morning browsing spike" },
        { day: "Tuesday", time: "14:00", reason: "Mid-week engagement peak" },
    ],
    tiktok: [
        { day: "Tuesday", time: "09:00", reason: "Morning commute scroll session" },
        { day: "Friday", time: "17:00", reason: "End-of-week wind-down peak" },
        { day: "Saturday", time: "11:00", reason: "Weekend leisure browsing" },
    ],
    instagram: [
        { day: "Wednesday", time: "11:00", reason: "Mid-week lunch break engagement" },
        { day: "Friday", time: "10:00", reason: "Friday morning peak reach" },
        { day: "Sunday", time: "19:00", reason: "Sunday evening relaxation browsing" },
    ],
    facebook: [
        { day: "Wednesday", time: "13:00", reason: "Lunch break scrolling peak" },
        { day: "Thursday", time: "18:00", reason: "Post-work engagement" },
        { day: "Friday", time: "11:00", reason: "Pre-weekend mood boost" },
    ],
};

function getRuleBasedSuggestions(title: string, description: string, platform: string) {
    const tips: string[] = [];

    if (title.length > 70 && platform === "youtube") {
        tips.push("Shorten your title to under 70 characters for better click-through rate on YouTube");
    }
    if (!description || description.length < 50) {
        tips.push("Add a detailed description with keywords to improve discoverability");
    }
    if (!description?.includes("#") && ["tiktok", "instagram"].includes(platform)) {
        tips.push(`Add hashtags to your ${platform} post to increase reach`);
    }

    const platformTags: Record<string, string[]> = {
        youtube: ["youtube", "viral", "trending", "subscribe", "video"],
        tiktok: ["fyp", "foryoupage", "viral", "trending", "tiktok"],
        instagram: ["instagood", "reels", "explore", "viral", "instagram"],
        facebook: ["facebook", "video", "share", "viral", "trending"],
    };

    return {
        optimisedTitle: title,
        optimisedDescription: description || `Watch this amazing content! Like and share for more.`,
        hashtags: platformTags[platform] ?? [],
        bestPostingTimes: PLATFORM_POSTING_TIMES[platform] ?? [],
        tips: tips.length > 0 ? tips : ["Engage with your audience by replying to comments within the first hour"],
    };
}
