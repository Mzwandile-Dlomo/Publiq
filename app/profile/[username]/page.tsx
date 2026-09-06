import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteFooter } from "@/components/layout/site-footer";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Globe, Play, ImageIcon, ExternalLink } from "lucide-react";
import { getPlatformPostUrl, type Platform } from "@/lib/platforms";
import { syncPublicationStats } from "@/lib/publication-sync";

const PLATFORM_ICONS: Record<string, string> = {
    youtube: "YT",
    tiktok: "TT",
    instagram: "IG",
    facebook: "FB",
};

interface ProfilePageProps {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps) {
    const { username } = await params;
    const user = await prisma.user.findUnique({
        where: { username },
        select: { name: true, bio: true, profilePublic: true },
    });

    if (!user || !user.profilePublic) {
        return { title: "Profile not found" };
    }

    return {
        title: `${user.name ?? username} – Publiq`,
        description: user.bio ?? `${user.name ?? username}'s creator profile on Publiq`,
    };
}

export default async function CreatorProfilePage({ params }: ProfilePageProps) {
    const { username } = await params;

    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            id: true,
            name: true,
            image: true,
            username: true,
            bio: true,
            niches: true,
            website: true,
            profilePublic: true,
            role: true,
            createdAt: true,
            socialAccounts: {
                select: { provider: true, name: true, avatarUrl: true },
            },
            content: {
                where: { status: "published" },
                orderBy: { createdAt: "desc" },
                take: 20,
                include: {
                    publications: {
                        select: {
                            id: true,
                            platform: true,
                            platformPostId: true,
                            status: true,
                            views: true,
                            likes: true,
                            comments: true,
                        },
                    },
                },
            },
        },
    });

    if (!user || !user.profilePublic) {
        notFound();
    }

    // Keep the public portfolio aligned with the platforms. In particular, a
    // YouTube video deleted after publishing must not retain a live-looking link.
    const unavailablePublicationIds = await syncPublicationStats(
        user.id,
        user.content.flatMap((content) => content.publications)
    );

    const visibleContent = user.content
        .map((content) => ({
            ...content,
            publications: content.publications.filter(
                (publication) => publication.status === "success" && !unavailablePublicationIds.has(publication.id)
            ),
        }))
        .filter((content) => content.publications.length > 0);

    const displayName = user.name ?? user.username ?? "Creator";
    const initials = displayName
        .split(" ")
        .map((p: string) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const totalViews = visibleContent.reduce((sum: number, c: typeof visibleContent[number]) =>
        sum + c.publications.reduce((s: number, p: typeof c.publications[number]) => s + p.views, 0), 0);
    const totalLikes = visibleContent.reduce((sum: number, c: typeof visibleContent[number]) =>
        sum + c.publications.reduce((s: number, p: typeof c.publications[number]) => s + p.likes, 0), 0);

    const platforms = [...new Set(user.socialAccounts.map((a: typeof user.socialAccounts[number]) => a.provider))] as const;

    return (
        <div className="min-h-screen">
            <main className="mx-auto max-w-4xl px-6 py-16">
                <Link
                    href="/discover"
                    className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to creators
                </Link>
                {/* Hero */}
                <div className="flex flex-col items-center gap-6 text-center">
                    {user.image ? (
                        <Image
                            src={user.image}
                            alt={displayName}
                            width={96}
                            height={96}
                            className="h-24 w-24 rounded-full object-cover"
                        />
                    ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                            {initials}
                        </div>
                    )}

                    <div>
                        <h1 className="text-3xl font-semibold">{displayName}</h1>
                        {user.username && (
                            <p className="mt-1 text-sm text-muted-foreground">@{user.username}</p>
                        )}
                    </div>

                    {user.bio && (
                        <p className="max-w-md text-muted-foreground">{user.bio}</p>
                    )}

                    {/* Niches */}
                    {user.niches.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2">
                            {user.niches.map((niche: string) => (
                                <span
                                    key={niche}
                                    className="rounded-full border border-border px-3 py-1 text-xs font-medium capitalize"
                                >
                                    {niche}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Links row */}
                    <div className="flex flex-wrap justify-center gap-3">
                        {user.website && (
                            <a
                                href={user.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs hover:border-foreground/30 transition-colors"
                            >
                                <Globe className="h-3.5 w-3.5" />
                                Website
                            </a>
                        )}
                        {platforms.map((p: typeof platforms[number]) => (
                            <span
                                key={p as string}
                                className="flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs capitalize"
                            >
                                {PLATFORM_ICONS[p as string] ?? p}
                                {String(p)}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Stats bar */}
                <div className="mt-12 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border">
                    <div className="flex flex-col items-center py-5">
                        <span className="text-2xl font-semibold">{visibleContent.length}</span>
                        <span className="mt-1 text-xs text-muted-foreground">Posts</span>
                    </div>
                    <div className="flex flex-col items-center py-5">
                        <span className="text-2xl font-semibold">{totalViews.toLocaleString()}</span>
                        <span className="mt-1 text-xs text-muted-foreground">Total Views</span>
                    </div>
                    <div className="flex flex-col items-center py-5">
                        <span className="text-2xl font-semibold">{totalLikes.toLocaleString()}</span>
                        <span className="mt-1 text-xs text-muted-foreground">Total Likes</span>
                    </div>
                </div>

                {/* Portfolio grid */}
                {visibleContent.length > 0 && (
                    <section className="mt-12">
                        <h2 className="text-xl font-semibold">Portfolio</h2>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                            {visibleContent.map((item: typeof visibleContent[number]) => {
                                const views = item.publications.reduce((s: number, p: typeof item.publications[number]) => s + p.views, 0);
                                const likes = item.publications.reduce((s: number, p: typeof item.publications[number]) => s + p.likes, 0);
                                return (
                                    <div
                                        key={item.id}
                                        className="group relative overflow-hidden rounded-2xl border border-border bg-card"
                                    >
                                        {item.mediaType === "video" ? (
                                            // Uploaded videos have no generated thumbnail, so play
                                            // the media itself and use a thumbnail as poster if set.
                                            <video
                                                src={item.mediaUrl}
                                                poster={item.thumbnailUrl ?? undefined}
                                                controls
                                                preload="metadata"
                                                className="h-40 w-full bg-black object-cover"
                                            />
                                        ) : item.thumbnailUrl ?? item.mediaUrl ? (
                                            <Image
                                                src={(item.thumbnailUrl ?? item.mediaUrl)!}
                                                alt={item.title}
                                                width={400}
                                                height={225}
                                                className="h-40 w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-40 w-full items-center justify-center bg-secondary text-muted-foreground">
                                                {item.mediaType === "video" ? (
                                                    <Play className="h-8 w-8" />
                                                ) : (
                                                    <ImageIcon className="h-8 w-8" />
                                                )}
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                                            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>{views.toLocaleString()} views</span>
                                                <span>{likes.toLocaleString()} likes</span>
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {item.publications.map((pub: typeof item.publications[number]) => {
                                                    // Only posts that actually landed have a live URL.
                                                    const postUrl =
                                                        pub.status === "success" && pub.platformPostId
                                                            ? getPlatformPostUrl(
                                                                  pub.platform as Platform,
                                                                  pub.platformPostId,
                                                              )
                                                            : null;
                                                    const label = (
                                                        <>
                                                            {pub.platform}
                                                            {postUrl && <ExternalLink className="h-2.5 w-2.5" />}
                                                        </>
                                                    );
                                                    return postUrl ? (
                                                        <a
                                                            key={pub.platform}
                                                            href={postUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize transition-colors hover:bg-foreground hover:text-background"
                                                        >
                                                            {label}
                                                        </a>
                                                    ) : (
                                                        <span
                                                            key={pub.platform}
                                                            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize"
                                                        >
                                                            {label}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* CTA for brands */}
                <div className="mt-16 rounded-2xl border border-border bg-secondary/30 p-8 text-center">
                    <h2 className="text-xl font-semibold">Want to collaborate?</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Brands can invite {displayName} to campaigns on Publiq.
                    </p>
                    <Link
                        href="/auth/signup?role=brand"
                        className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm text-primary-foreground transition hover:opacity-90"
                    >
                        Create a brand account
                    </Link>
                </div>

                <SiteFooter />
            </main>
        </div>
    );
}
