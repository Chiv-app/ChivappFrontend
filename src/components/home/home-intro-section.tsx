"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import MusicianCard from "@/components/layout/musician-card";
import EmptyMusiciansState from "@/components/musicians/empty-musicians-state";
import MasonryItem from "@/components/ui/masonry-item";
import RotatingMessageCard from "@/components/home/rotating-message-card";
import type { MusicianCard as MusicianCardModel } from "@/types/ui/musician";

type Props = {
    musicians: MusicianCardModel[];
    hasMoreMusicians?: boolean;
};

function scrollToNextSection() {
    document
        .getElementById("home-content")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function HomeIntroSection({ musicians, hasMoreMusicians = false }: Props) {
    return (
        <section
            id="musicians"
            className="relative min-h-[100dvh] w-full overflow-hidden pt-20 sm:pt-24 pb-24 sm:pb-28"
        >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[min(36rem,70vh)] bg-gradient-radial-brand -z-10" />

            <div className="max-w-[1800px] mx-auto w-full px-4 sm:px-8 md:px-12 lg:px-16">
                {musicians.length === 0 ? (
                    <EmptyMusiciansState />
                ) : (
                    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7 lg:gap-8 grid-flow-dense auto-rows-[10px]">
                        <MasonryItem index={0}>
                            <RotatingMessageCard />
                        </MasonryItem>
                        {musicians.map((m, i) => (
                            <MasonryItem key={m.id} index={i + 1}>
                                <MusicianCard musician={m} index={i} size="large" />
                            </MasonryItem>
                        ))}
                    </div>
                )}

                {hasMoreMusicians ? (
                    <div className="flex justify-center mt-8 sm:mt-10">
                        <Link
                            href="/musicians"
                            className="inline-flex items-center gap-2 rounded-full border border-default-200/70 bg-content1/80 backdrop-blur-md px-6 py-3 font-semibold text-foreground shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all"
                        >
                            Ver todos los músicos
                            <Icon icon="material-symbols:arrow-forward" width={18} />
                        </Link>
                    </div>
                ) : null}
            </div>

            {/*
              `sticky` (no `absolute`) para que la señal flote sobre las
              cards mientras se hace scroll DENTRO de esta sección, pero se
              quede atrás en cuanto termina (no invade #home-content): el
              contenedor `h-0` no aporta altura propia, así que el punto de
              "stick" lo define el propio &lt;section&gt;, que mide lo que ocupan
              las cards.
            */}
            <div className="sticky bottom-10 sm:bottom-14 z-[100] h-0 flex items-center justify-center pointer-events-none">
                <button
                    type="button"
                    onClick={scrollToNextSection}
                    aria-label="Descubre más hacia abajo"
                    className="group pointer-events-auto flex items-center justify-center"
                >
                    <span className="relative flex items-center justify-center size-10 sm:size-12">
                        {/* Ping effect behind the button */}
                        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                        {/* Solid button */}
                        <span className="relative flex items-center justify-center size-10 sm:size-12 rounded-full bg-content1/95 backdrop-blur-md shadow-elevated border border-default-200/60 group-hover:border-primary/50 transition-colors">
                            <Icon
                                icon="material-symbols:keyboard-arrow-down-rounded"
                                width={24}
                                height={24}
                                className="text-foreground group-hover:text-primary transition-colors"
                            />
                        </span>
                    </span>
                </button>
            </div>
        </section>
    );
}
