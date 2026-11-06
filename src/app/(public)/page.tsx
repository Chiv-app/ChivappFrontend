import type { Metadata } from "next";
import { getMusicians, getPlatformStats, getLatestReviews } from "@/lib/musicians";
import HomeSeoSection from "@/components/home/home-seo-section";
import HomeView from "@/components/home/home-view";
import { SITE_DESCRIPTION, SITE_NAME, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    path: "/",
});

export const revalidate = 60;

const HOME_MUSICIANS_LIMIT = 5;

export default async function Page() {
    const [musiciansResult, statsResult, reviewsResult] = await Promise.allSettled([
        getMusicians({ limit: HOME_MUSICIANS_LIMIT + 1 }),
        getPlatformStats(),
        getLatestReviews(5),
    ]);

    const musicians = musiciansResult.status === "fulfilled" ? musiciansResult.value : [];
    const stats = statsResult.status === "fulfilled" ? statsResult.value : null;
    const reviews = reviewsResult.status === "fulfilled" ? reviewsResult.value : [];

    const hasMoreMusicians = musicians.length > HOME_MUSICIANS_LIMIT;

    return (
        <>
            <HomeView
                musicians={musicians.slice(0, HOME_MUSICIANS_LIMIT)}
                hasMoreMusicians={hasMoreMusicians}
                stats={stats}
                reviews={reviews}
            />
            <HomeSeoSection />
        </>
    );
}
