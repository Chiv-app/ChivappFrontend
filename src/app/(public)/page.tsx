import type { Metadata } from "next";
import { getMusicians, getPlatformStats, getLatestReviews } from "@/lib/musicians";
import HomeView from "@/components/home/home-view";
import { SITE_DESCRIPTION, SITE_NAME, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    path: "/",
});

export const dynamic = "force-dynamic";

const HOME_MUSICIANS_LIMIT = 5;

export default async function Page() {
    let musicians: Awaited<ReturnType<typeof getMusicians>> = [];
    let stats = null;
    let reviews: any[] = [];

    try {
        [musicians, stats, reviews] = await Promise.all([
            getMusicians({ limit: HOME_MUSICIANS_LIMIT + 1 }),
            getPlatformStats(),
            getLatestReviews(5)
        ]);
    } catch {
        musicians = [];
        stats = null;
        reviews = [];
    }

    const hasMoreMusicians = musicians.length > HOME_MUSICIANS_LIMIT;

    return (
        <HomeView
            musicians={musicians.slice(0, HOME_MUSICIANS_LIMIT)}
            hasMoreMusicians={hasMoreMusicians}
            stats={stats}
            reviews={reviews}
        />
    );
}
