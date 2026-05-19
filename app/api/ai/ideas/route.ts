import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { z } from "zod";

const ideasSchema = z.object({
    niches: z.array(z.string()).min(1).max(5),
    recentTitles: z.array(z.string()).max(10).optional(),
    platform: z.enum(["youtube", "tiktok", "instagram", "facebook"]).optional(),
});

/**
 * POST /api/ai/ideas
 * Returns content ideas based on the creator's niches and recent content.
 */
export async function POST(req: Request) {
    const session = await verifySession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    try {
        const body = await req.json();
        const { niches, recentTitles, platform } = ideasSchema.parse(body);

        if (!apiKey) {
            return NextResponse.json({
                ideas: getRuleBasedIdeas(niches, platform),
                source: "rule-based",
            });
        }

        const prompt = buildIdeasPrompt(niches, recentTitles ?? [], platform);

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
                            "You are a creative social media content strategist. Respond ONLY with valid JSON.",
                    },
                    { role: "user", content: prompt },
                ],
                temperature: 0.9,
                max_tokens: 1000,
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("OpenAI error:", err);
            return NextResponse.json({
                ideas: getRuleBasedIdeas(niches, platform),
                source: "rule-based",
            });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const parsed = JSON.parse(content);

        return NextResponse.json({ ideas: parsed.ideas, source: "ai" });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("AI ideas error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

function buildIdeasPrompt(niches: string[], recentTitles: string[], platform?: string): string {
    const platformLine = platform ? `Target platform: ${platform}` : "Multiple platforms";
    const recentLine =
        recentTitles.length > 0
            ? `Recent content (avoid repeating these themes):\n${recentTitles.map((t) => `- ${t}`).join("\n")}`
            : "";

    return `Generate 8 fresh content ideas for a creator in the following niches: ${niches.join(", ")}.
${platformLine}
${recentLine}

Return JSON:
{
  "ideas": [
    {
      "title": "...",
      "concept": "2-3 sentence description",
      "format": "short-form | long-form | series | tutorial | challenge",
      "hook": "Opening line to grab attention",
      "trend": "Why this is timely/trending"
    }
  ]
}

Make ideas specific, actionable, and genuinely engaging. Vary the formats.`;
}

const NICHE_IDEAS: Record<string, { title: string; concept: string; format: string; hook: string; trend: string }[]> = {
    gaming: [
        { title: "5 mechanics that made me quit a game immediately", concept: "Discuss common frustrating game design decisions", format: "short-form", hook: "Game devs hate this one quirk", trend: "Gaming frustration content performs well" },
        { title: "I played [trending game] for 24 hours straight", concept: "Endurance gaming marathon with commentary", format: "long-form", hook: "What happens to your brain after 24 hours of gaming?", trend: "Endurance challenges are viral right now" },
    ],
    fitness: [
        { title: "The 10-minute morning routine that changed my life", concept: "Quick morning workout that requires no equipment", format: "short-form", hook: "You have 10 minutes. That's all you need.", trend: "Micro-workout content is trending" },
        { title: "I tried every viral fitness trend so you don't have to", concept: "Honest review of popular fitness challenges", format: "series", hook: "Warning: some of these are actually dangerous", trend: "Debunking viral trends gets massive engagement" },
    ],
    food: [
        { title: "Recreating viral TikTok recipes — worth it?", concept: "Test and review popular food trends", format: "short-form", hook: "I spent R500 on this 30-second recipe", trend: "Recipe reaction content consistently trends" },
        { title: "What I eat in a week on a R500 budget", concept: "Budget meal planning with full recipes", format: "series", hook: "Eating healthy doesn't have to be expensive", trend: "Budget cooking is massively popular" },
    ],
    tech: [
        { title: "I switched to [alternative] for 30 days", concept: "Document switching from mainstream tech to an alternative", format: "long-form", hook: "Everyone told me I'd hate it. They were wrong.", trend: "30-day challenges generate sustained engagement" },
        { title: "Features your phone has that you never use", concept: "Hidden/underused smartphone features tutorial", format: "short-form", hook: "You've been using your phone wrong", trend: "Hidden features content goes viral regularly" },
    ],
};

const DEFAULT_IDEAS = [
    { title: "Day in my life as a creator", concept: "Authentic behind-the-scenes daily routine", format: "short-form", hook: "This is what my 'normal' day actually looks like", trend: "Authentic day-in-the-life content resonates strongly" },
    { title: "Questions I get asked the most — answered", concept: "FAQ-style Q&A addressing your audience's curiosity", format: "short-form", hook: "You've been asking. Here are the real answers.", trend: "Q&A content drives comment engagement" },
    { title: "What I wish I knew when I started", concept: "Lessons and mistakes from your creator journey", format: "long-form", hook: "I wasted 6 months on this one mistake", trend: "Beginner advice content has evergreen appeal" },
];

function getRuleBasedIdeas(niches: string[], platform?: string) {
    const ideas = niches.flatMap((n) => NICHE_IDEAS[n] ?? []);
    const combined = ideas.length > 0 ? [...ideas, ...DEFAULT_IDEAS] : DEFAULT_IDEAS;
    return combined.slice(0, 8);
}
