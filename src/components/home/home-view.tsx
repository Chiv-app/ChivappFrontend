"use client";

import HeroSearchSection from "@/components/home/hero-search-section";
import HomeIntroSection from "@/components/home/home-intro-section";
import ProcessSection from "@/components/home/process-view";
import WhyChivappSection from "@/components/home/why-chivapp-view";
import FaqSection from "@/components/home/faq-view";
import MusicianCtaSection from "@/components/home/musician-cta-view";
import ProfileCompletionBanner from "@/components/profile/profile-completion-banner";
import type { MusicianCard as MusicianCardModel } from "@/types/ui/musician";
import type { PlatformStatsOut } from "@/types/api";
import type { PublicLatestReview } from "@/lib/musicians";

type Props = {
    musicians: MusicianCardModel[];
    hasMoreMusicians?: boolean;
    stats: PlatformStatsOut | null;
    reviews?: PublicLatestReview[];
};

export default function HomeView({ musicians, hasMoreMusicians = false, reviews = [] }: Props) {
    return (
        <div className="relative w-full overflow-x-clip">
            <div className="absolute top-[var(--app-navbar-height)] left-0 right-0 z-40 px-4 sm:px-6">
                <div className="max-w-[1400px] mx-auto">
                    <ProfileCompletionBanner />
                </div>
            </div>

            <HeroSearchSection />
            <HomeIntroSection musicians={musicians} hasMoreMusicians={hasMoreMusicians} />
            <ProcessSection />
            <WhyChivappSection reviews={reviews} />
            <FaqSection />
            <MusicianCtaSection />
        </div>
    );
}
