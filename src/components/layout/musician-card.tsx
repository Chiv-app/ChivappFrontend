"use client";

import { useEffect, useMemo, useState } from "react";
import type { MusicianCard } from "@/types/ui/musician";
import { Icon } from "@iconify/react";
import Image from "next/image";
import Link from "next/link";

type Props = {
    musician: MusicianCard;
    /** Position in the home grid (used for stable aspect variety). */
    index?: number;
    /** "large" para la intro del home, donde hay pocas cards y deben ocupar más espacio. */
    size?: "default" | "large";
};

const FALLBACK_IMAGE =
    "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg";
const CAROUSEL_MS = 2500;

/** Stable aspect-ratio pattern so masonry heights vary across cards. */
const ASPECT_VARIANTS = [
    "aspect-[3/4]",
    "aspect-[4/5]",
    "aspect-[5/6]",
    "aspect-square",
    "aspect-[5/4]",
    "aspect-[6/5]",
    "aspect-[2/3]",
    "aspect-[4/3]",
] as const;

const TEXT_SHADOW = "drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]";

/** Soft, natural ease — settles without a hard stop. */
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

function locationLabel(musician: MusicianCard): string | null {
    if (musician.city && musician.zone) return `${musician.city} · ${musician.zone}`;
    return musician.city || musician.zone || null;
}

function pickAspectClass(musicianId: string, index: number): string {
    let hash = index * 17;
    for (let i = 0; i < musicianId.length; i += 1) {
        hash = (hash + musicianId.charCodeAt(i) * (i + 3)) % 997;
    }
    return ASPECT_VARIANTS[Math.abs(hash) % ASPECT_VARIANTS.length];
}

export default function MusicianCardComponent({
    musician,
    index = 0,
    size = "default",
}: Props) {
    const location = locationLabel(musician);
    const genreTags = musician.genres.slice(0, 3);
    const instrumentTags = musician.instruments.slice(0, 2);
    const previewTags = [...genreTags, ...instrumentTags].slice(0, 4);
    const aspectClass = pickAspectClass(musician.id, index);

    const slides = useMemo(() => {
        const list = musician.images?.length
            ? musician.images
            : musician.image
              ? [musician.image]
              : [];
        return list.length > 0 ? list : [FALLBACK_IMAGE];
    }, [musician.image, musician.images]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const canRotate = slides.length > 1;

    useEffect(() => {
        setActiveIndex(0);
    }, [musician.id, slides.length]);

    useEffect(() => {
        if (!canRotate || paused) return;
        const id = window.setInterval(() => {
            setActiveIndex((current) => (current + 1) % slides.length);
        }, CAROUSEL_MS);
        return () => window.clearInterval(id);
    }, [canRotate, paused, slides.length]);

    const metaLine = [
        musician.priceLabel,
        musician.rating != null
            ? `★ ${musician.rating.toFixed(1)}${
                  musician.ratingCount != null && musician.ratingCount > 0
                      ? ` (${musician.ratingCount})`
                      : ""
              }`
            : "Nuevo",
    ].join("  ·  ");

    return (
        <Link
            href={`/musicians/${musician.slug || musician.id}`}
            className={[
                "relative group overflow-hidden rounded-3xl sm:rounded-4xl break-inside-avoid cursor-pointer block w-full",
                size === "large"
                    ? "min-h-64 sm:min-h-80 lg:min-h-[28rem]"
                    : "min-h-48 sm:min-h-56",
                aspectClass,
                "ring-1 ring-transparent shadow-soft",
                "transition-[transform,box-shadow,ring-color] duration-500",
                EASE,
                "hover:-translate-y-1 hover:shadow-elevated hover:ring-primary/40",
            ].join(" ")}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <div
                className={[
                    "absolute inset-0 origin-center will-change-transform",
                    "transition-transform duration-[1200ms]",
                    "ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                    "group-hover:scale-[1.08]",
                ].join(" ")}
            >
                {slides.map((src, slideIndex) => {
                    const isActive = slideIndex === activeIndex;
                    return (
                        <Image
                            key={`${musician.id}-${src}-${slideIndex}`}
                            src={src}
                            alt={`${musician.name} — foto ${slideIndex + 1}`}
                            fill={true}
                            className={[
                                "object-cover",
                                "transition-opacity duration-700 ease-in-out",
                                isActive ? "opacity-100" : "opacity-0",
                            ].join(" ")}
                            sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 33vw"
                            priority={slideIndex === 0 ? true : undefined}
                        />
                    );
                })}
            </div>

            {/* Scrims for contrast */}
            <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"
            />
            <div
                aria-hidden
                className={[
                    "absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/15",
                    "opacity-0 transition-opacity duration-500",
                    EASE,
                    "[@media(hover:hover)]:group-hover:opacity-100",
                ].join(" ")}
            />

            {/*
              Content anchored to the bottom. On hover the detail block expands
              upward in normal document flow; CTA stays last.
            */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-3.5 sm:p-5">
                <div className="flex flex-col items-stretch gap-0">
                    <h3
                        className={`font-bold text-base sm:text-lg md:text-xl leading-snug line-clamp-2 text-white ${TEXT_SHADOW}`}
                    >
                        {musician.name}
                    </h3>
                    <p
                        className={`text-xs sm:text-sm text-white mt-1 truncate ${TEXT_SHADOW}`}
                    >
                        {musician.genre}
                        {musician.price != null ? ` · S/ ${musician.price}` : ""}
                    </p>

                    {/* Expandable details — grows upward from the bottom stack */}
                    <div
                        className={[
                            "grid transition-[grid-template-rows,opacity,margin] duration-500",
                            EASE,
                            // Touch: keep a compact meta line visible
                            "grid-rows-[1fr] opacity-100 mt-2",
                            // Hover devices: collapsed until hover
                            "[@media(hover:hover)]:grid-rows-[0fr] [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:mt-0",
                            "[@media(hover:hover)]:group-hover:grid-rows-[1fr] [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:mt-2.5",
                            "[@media(hover:hover)]:group-hover:delay-75",
                        ].join(" ")}
                    >
                        <div className="min-h-0 overflow-hidden">
                            <div className="flex flex-col gap-1.5 pt-0.5">
                                {/* On touch show only meta; on hover show full detail */}
                                <div className="hidden [@media(hover:hover)]:contents">
                                    {location ? (
                                        <p
                                            className={`text-xs sm:text-sm text-white/95 flex items-center gap-1 ${TEXT_SHADOW}`}
                                        >
                                            <Icon
                                                icon="material-symbols:location-on-outline"
                                                width={15}
                                                className="shrink-0"
                                            />
                                            <span className="truncate">
                                                {location}
                                            </span>
                                        </p>
                                    ) : null}

                                    {musician.bio ? (
                                        <p
                                            className={`text-xs sm:text-sm text-white/95 leading-relaxed line-clamp-2 ${TEXT_SHADOW}`}
                                        >
                                            {musician.bio}
                                        </p>
                                    ) : null}

                                    {previewTags.length > 0 ? (
                                        <p
                                            className={`text-[11px] sm:text-xs text-white/90 leading-snug line-clamp-1 ${TEXT_SHADOW}`}
                                        >
                                            {previewTags.join(" · ")}
                                        </p>
                                    ) : null}
                                </div>

                                <p
                                    className={`text-xs sm:text-sm font-semibold text-white ${TEXT_SHADOW}`}
                                >
                                    {metaLine}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA: last in stack; only on hover (visible on touch devices) */}
                    <div
                        className={[
                            "grid transition-[grid-template-rows,opacity,margin,transform] duration-500",
                            EASE,
                            "grid-rows-[1fr] opacity-100 mt-3 translate-y-0",
                            "[@media(hover:hover)]:grid-rows-[0fr] [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:mt-0 [@media(hover:hover)]:translate-y-1.5",
                            "[@media(hover:hover)]:group-hover:grid-rows-[1fr] [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:mt-3 [@media(hover:hover)]:group-hover:translate-y-0",
                            "[@media(hover:hover)]:group-hover:delay-150",
                        ].join(" ")}
                    >
                        <div className="min-h-0 overflow-hidden">
                            <span
                                className={[
                                    "inline-flex w-full items-center justify-center gap-1.5 rounded-full py-2.5",
                                    "text-xs sm:text-sm font-semibold bg-primary text-primary-foreground shadow-soft",
                                    "transition-transform duration-500",
                                    EASE,
                                    "[@media(hover:hover)]:group-hover:scale-[1.01]",
                                ].join(" ")}
                            >
                                Ver perfil
                                <Icon
                                    icon="material-symbols:arrow-forward"
                                    width={16}
                                    className="opacity-90"
                                />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

