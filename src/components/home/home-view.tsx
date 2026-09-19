"use client";

import { useEffect } from "react";
import HomeIntroSection from "@/components/home/home-intro-section";
import HeroView from "@/components/home/hero-view";
import StatsSection from "@/components/home/stats-view";
import ProcessSection from "@/components/home/process-view";
import WhyChivappSection from "@/components/home/why-chivapp-view";
import MusicianCtaSection from "@/components/home/musician-cta-view";
import FaqSection from "@/components/home/faq-view";
import ProfileCompletionBanner from "@/components/profile/profile-completion-banner";
import SeoLinksView from "@/components/home/seo-links-view";
import type { MusicianCard as MusicianCardModel } from "@/types/ui/musician";
import type { PlatformStatsOut } from "@/types/api";

type Props = {
    musicians: MusicianCardModel[];
    hasMoreMusicians?: boolean;
    stats: PlatformStatsOut | null;
};

export default function HomeView({ musicians, hasMoreMusicians = false, stats }: Props) {
    // Oculta la barra de scroll solo en el home (la intro a pantalla completa
    // se ve más limpia sin ella); se restaura al salir de la página.
    // Se inyecta como <style> propio en vez de una clase en <html> porque
    // next-themes reescribe el atributo class del root y la borraría.
    useEffect(() => {
        const style = document.createElement("style");
        style.textContent = `
            html {
                scrollbar-width: none;
                -ms-overflow-style: none;
            }
            html::-webkit-scrollbar {
                display: none;
                width: 0;
                height: 0;
            }
        `;
        document.head.appendChild(style);
        return () => {
            style.remove();
        };
    }, []);

    return (
        <main className="relative w-full overflow-x-clip">
            <HomeIntroSection musicians={musicians} hasMoreMusicians={hasMoreMusicians} />

            <div
                id="home-content"
                className="max-w-content mx-auto px-4 sm:px-6 md:px-8 pt-[var(--app-navbar-height)] pb-16 sm:pb-24 scroll-mt-[var(--app-navbar-height)]"
            >
                <ProfileCompletionBanner />

                <HeroView />
                
                <SeoLinksView />
            </div>

            <StatsSection stats={stats} />
            <ProcessSection />
            <WhyChivappSection />
            <MusicianCtaSection />
            <FaqSection />
        </main>
    );
}
